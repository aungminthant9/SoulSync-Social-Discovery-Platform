const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ============================================
// GET /api/messages/conversations
// Returns all match conversations with last message + unread count
// ⚠️ Must be BEFORE /:matchId to avoid route collision
// ============================================
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // All matches for this user
    const { data: matches } = await supabase
      .from('matches')
      .select('id, user1_id, user2_id, created_at')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (!matches?.length) return res.json({ conversations: [] });

    // Read status
    const { data: readStatus } = await supabase
      .from('match_read_status')
      .select('match_id, last_read_at')
      .eq('user_id', userId);
    const readMap = Object.fromEntries((readStatus || []).map((r) => [r.match_id, r.last_read_at]));

    // Partner user details in one query
    const partnerIds = matches.map((m) => (m.user1_id === userId ? m.user2_id : m.user1_id));
    const { data: users } = await supabase
      .from('users')
      .select('id, name, avatar_url, city, country')
      .in('id', partnerIds);
    const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));

    const conversations = [];

    for (const match of matches) {
      const partnerId = match.user1_id === userId ? match.user2_id : match.user1_id;
      const partner = userMap[partnerId];

      // Last message
      const { data: lastMsgArr } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at')
        .eq('match_id', match.id)
        .order('created_at', { ascending: false })
        .limit(1);
      const lastMessage = lastMsgArr?.[0] || null;

      // Unread count (graceful if table missing)
      let unreadCount = 0;
      try {
        const lastRead = readMap[match.id] || '1970-01-01T00:00:00Z';
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('match_id', match.id)
          .neq('sender_id', userId)
          .gt('created_at', lastRead);
        unreadCount = count ?? 0;
      } catch { /* ignore */ }

      conversations.push({
        matchId: match.id,
        user: partner,
        lastMessage,
        unreadCount,
        matchedAt: match.created_at,
      });
    }

    // Sort by most recent message, then match date
    conversations.sort((a, b) => {
      const at = a.lastMessage?.created_at || a.matchedAt || '0';
      const bt = b.lastMessage?.created_at || b.matchedAt || '0';
      return bt.localeCompare(at);
    });

    res.json({ conversations });
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// GET /api/messages/unread — Total unread + per-match breakdown
// ============================================
router.get('/unread', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: matches } = await supabase
      .from('matches')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (!matches || matches.length === 0) return res.json({ total: 0, byMatch: [] });

    const { data: readStatus } = await supabase
      .from('match_read_status')
      .select('match_id, last_read_at')
      .eq('user_id', userId);
    const readMap = Object.fromEntries((readStatus || []).map((r) => [r.match_id, r.last_read_at]));

    let total = 0;
    const byMatch = [];

    for (const match of matches) {
      const lastRead = readMap[match.id] || '1970-01-01T00:00:00Z';
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', match.id)
        .neq('sender_id', userId)
        .gt('created_at', lastRead);
      const c = count ?? 0;
      if (c > 0) { total += c; byMatch.push({ matchId: match.id, count: c }); }
    }

    res.json({ total, byMatch });
  } catch (err) {
    console.error('Unread count error:', err.message);
    res.json({ total: 0, byMatch: [] });
  }
});

// ============================================
// POST /api/messages/:matchId/read
// ============================================
router.post('/:matchId/read', authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;
    await supabase
      .from('match_read_status')
      .upsert({ match_id: matchId, user_id: userId, last_read_at: new Date().toISOString() },
               { onConflict: 'match_id,user_id' });
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err.message);
    res.json({ message: 'ok' });
  }
});

// ============================================
// GET /api/messages/:matchId — History with reactions
// ============================================
router.get('/:matchId', authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before;

    const { data: match } = await supabase
      .from('matches')
      .select('id, user1_id, user2_id')
      .eq('id', matchId)
      .single();

    if (!match) return res.status(404).json({ error: 'Match not found.' });
    if (match.user1_id !== userId && match.user2_id !== userId)
      return res.status(403).json({ error: 'Not part of this match.' });

    let query = supabase
      .from('messages')
      .select('id, match_id, sender_id, content, created_at')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) query = query.lt('created_at', before);
    const { data: messages, error } = await query;
    if (error) throw error;

    const msgs = (messages || []).reverse();

    if (msgs.length > 0) {
      try {
        const { data: reactions } = await supabase
          .from('message_reactions')
          .select('message_id, emoji, user_id')
          .in('message_id', msgs.map((m) => m.id));
        const reactionMap = {};
        for (const r of reactions || []) {
          if (!reactionMap[r.message_id]) reactionMap[r.message_id] = {};
          if (!reactionMap[r.message_id][r.emoji]) reactionMap[r.message_id][r.emoji] = [];
          reactionMap[r.message_id][r.emoji].push(r.user_id);
        }
        for (const msg of msgs) {
          msg.reactions = Object.entries(reactionMap[msg.id] || {}).map(([emoji, user_ids]) => ({
            emoji, user_ids, count: user_ids.length,
          }));
        }
      } catch { for (const msg of msgs) msg.reactions = []; }
    }

    res.json({ messages: msgs });
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
