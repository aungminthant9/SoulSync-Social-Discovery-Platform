const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ============================================
// POST /api/blocks — Block a user
// ============================================
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { blockedId } = req.body;
    const blockerId = req.user.id;

    if (!blockedId) return res.status(400).json({ error: 'blockedId is required.' });
    if (blockedId === blockerId) return res.status(400).json({ error: 'You cannot block yourself.' });

    // Upsert block (ignore duplicate)
    const { error } = await supabase
      .from('user_blocks')
      .upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' });

    if (error) throw error;

    // Also cancel any pending match requests between the two
    await supabase
      .from('match_requests')
      .delete()
      .or(
        `and(sender_id.eq.${blockerId},receiver_id.eq.${blockedId}),and(sender_id.eq.${blockedId},receiver_id.eq.${blockerId})`
      );

    res.json({ message: 'User blocked.' });
  } catch (err) {
    console.error('Block error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// DELETE /api/blocks/:blockedId — Unblock a user
// ============================================
router.delete('/:blockedId', authMiddleware, async (req, res) => {
  try {
    const { blockedId } = req.params;
    const blockerId = req.user.id;

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) throw error;

    res.json({ message: 'User unblocked.' });
  } catch (err) {
    console.error('Unblock error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// GET /api/blocks — Get my block list
// ============================================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const blockerId = req.user.id;

    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_id, created_at, blocked:users!user_blocks_blocked_id_fkey(id, name, avatar_url)')
      .eq('blocker_id', blockerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ blocks: data || [] });
  } catch (err) {
    console.error('Get blocks error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// GET /api/blocks/status/:targetId — Check if I blocked or am blocked by someone
// ============================================
router.get('/status/:targetId', authMiddleware, async (req, res) => {
  try {
    const { targetId } = req.params;
    const userId = req.user.id;

    const { data } = await supabase
      .from('user_blocks')
      .select('blocker_id, blocked_id')
      .or(
        `and(blocker_id.eq.${userId},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${userId})`
      );

    const iBlocked = (data || []).some((r) => r.blocker_id === userId);
    const theyBlocked = (data || []).some((r) => r.blocker_id === targetId);

    res.json({ iBlocked, theyBlocked });
  } catch (err) {
    console.error('Block status error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
