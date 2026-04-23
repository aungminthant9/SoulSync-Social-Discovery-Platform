const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const adminAuth = require('../middleware/adminAuth');

// All routes require admin auth
router.use(adminAuth);

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      { count: totalUsers },
      { count: newUsersToday },
      { count: totalMatches },
      { count: totalReports },
      { count: flaggedReports },
      { count: openReports },
      { count: totalGifts },
      { count: suspendedUsers },
      { count: bannedUsers },
      { count: totalAdViews },
      { count: adViewsToday },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('matches').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('ai_verdict', 'flagged'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('gift_transactions').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_suspended', true),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', true),
      supabase.from('ad_views').select('*', { count: 'exact', head: true }),
      supabase.from('ad_views').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    ]);

    res.json({
      totalUsers, newUsersToday, totalMatches,
      totalReports, flaggedReports, openReports,
      totalGifts, suspendedUsers, bannedUsers,
      totalAdViews, adViewsToday,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /api/admin/reports ───────────────────────────────────────────────────
router.get('/reports', async (req, res) => {
  const { status, verdict, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let query = supabase
      .from('reports')
      .select(`
        id, reason, message_content, ai_verdict, ai_explanation,
        status, admin_action, created_at, reviewed_at,
        reporter:reporter_id(id, name, email, avatar_url),
        reported:reported_id(id, name, email, avatar_url, is_suspended, is_banned, warnings_count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (status) query = query.eq('status', status);
    if (verdict) query = query.eq('ai_verdict', verdict);

    const { data: reports, count, error } = await query;
    if (error) throw error;

    res.json({ reports: reports || [], total: count || 0, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Admin reports error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── PUT /api/admin/reports/:id ───────────────────────────────────────────────
router.put('/reports/:id', async (req, res) => {
  const { id } = req.params;
  const { status, admin_action } = req.body;

  try {
    const { data, error } = await supabase
      .from('reports')
      .update({ status, admin_action, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ report: data });
  } catch (err) {
    console.error('Update report error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  const { search, status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let query = supabase
      .from('users')
      .select('id, name, email, avatar_url, credits, points, is_suspended, is_banned, warnings_count, is_admin, created_at, last_seen, is_online', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (search) query = query.ilike('name', `%${search}%`);
    if (status === 'suspended') query = query.eq('is_suspended', true);
    else if (status === 'banned') query = query.eq('is_banned', true);
    else if (status === 'warned') query = query.gt('warnings_count', 0);

    const { data: users, count, error } = await query;
    if (error) throw error;

    res.json({ users: users || [], total: count || 0, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── PUT /api/admin/users/:id/action ─────────────────────────────────────────
router.put('/users/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'warn' | 'suspend' | 'unsuspend' | 'ban' | 'unban'

  const NOTIFICATION_MAP = {
    warn: {
      type: 'warning',
      title: '⚠️ Account Warning Issued',
      message: 'You have received an official warning from the SoulSync moderation team. Continued violations of our Community Guidelines may result in a suspension or permanent ban. Please review our guidelines.',
    },
    suspend: {
      type: 'suspended',
      title: '🚫 Account Suspended',
      message: 'Your account has been temporarily suspended due to a violation of our Community Guidelines. During this period your interactions may be restricted. If you believe this is a mistake, please contact our support team.',
    },
    unsuspend: {
      type: 'unsuspended',
      title: '✅ Suspension Lifted',
      message: 'Your account suspension has been lifted and your account is now fully restored. Please ensure you follow our Community Guidelines to avoid future actions.',
    },
    ban: {
      type: 'banned',
      title: '🔴 Account Permanently Banned',
      message: 'Your account has been permanently banned for serious or repeated violations of our Community Guidelines. This decision is final. If you believe this is a mistake, please contact support@soulsync.app.',
    },
    unban: {
      type: 'unbanned',
      title: '✅ Ban Reversed',
      message: 'Your account ban has been reversed and your account has been fully restored. This is your final chance — any further violations will result in a permanent ban with no appeal.',
    },
  };

  try {
    let updates = {};
    if (action === 'warn') {
      const { data: u } = await supabase.from('users').select('warnings_count').eq('id', id).single();
      updates = { warnings_count: (u?.warnings_count ?? 0) + 1 };
    } else if (action === 'suspend') {
      updates = { is_suspended: true };
    } else if (action === 'unsuspend') {
      updates = { is_suspended: false };
    } else if (action === 'ban') {
      updates = { is_banned: true, is_suspended: false };
    } else if (action === 'unban') {
      updates = { is_banned: false };
    } else {
      return res.status(400).json({ error: 'Invalid action.' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, is_suspended, is_banned, warnings_count')
      .single();

    if (error) throw error;

    // Insert notification for the affected user
    const notif = NOTIFICATION_MAP[action];
    if (notif) {
      await supabase.from('notifications').insert({
        user_id: id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        is_read: false,
      });
    }

    res.json({ user: data, action });
  } catch (err) {
    console.error('User action error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /api/admin/economy ───────────────────────────────────────────────────
router.get('/economy', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      { data: recentGifts },
      { count: giftsToday },
      { data: totals },
    ] = await Promise.all([
      supabase
        .from('gift_transactions')
        .select(`
          id, created_at,
          sender:sender_id(id, name, avatar_url),
          receiver:receiver_id(id, name, avatar_url),
          sticker:sticker_id(name, icon, price_credits, point_value)
        `)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('gift_transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      supabase
        .from('users')
        .select('credits, points'),
    ]);

    const totalCredits = totals?.reduce((s, u) => s + (u.credits || 0), 0) ?? 0;
    const totalPoints = totals?.reduce((s, u) => s + (u.points || 0), 0) ?? 0;

    res.json({ recentGifts: recentGifts || [], giftsToday, totalCredits, totalPoints });
  } catch (err) {
    console.error('Admin economy error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
