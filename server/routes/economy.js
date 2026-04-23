const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// ── GET /api/economy/balance ───────────────────────────────────────────────────
// Returns current user's credits (to spend) and points (popularity)
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('credits, points')
      .eq('id', req.user.id)
      .single();
    if (error || !user) return res.status(404).json({ error: 'User not found.' });
    res.json({ credits: user.credits ?? 0, points: user.points ?? 0 });
  } catch (err) {
    console.error('Balance error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /api/economy/stickers ─────────────────────────────────────────────────
// Returns all available stickers (for the gift picker UI)
router.get('/stickers', authMiddleware, async (req, res) => {
  try {
    const { data: stickers, error } = await supabase
      .from('stickers')
      .select('id, name, icon, price_credits, point_value')
      .order('price_credits', { ascending: true });
    if (error) throw error;
    res.json({ stickers: stickers || [] });
  } catch (err) {
    console.error('Stickers error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /api/economy/leaderboard ───────────────────────────────────────────────
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, avatar_url, city, country, points')
      .order('points', { ascending: false })
      .limit(10);
    if (error) throw error;
    res.json({ leaderboard: users || [] });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── POST /api/economy/gift ─────────────────────────────────────────────────────
// Body: { matchId, receiverId, stickerId }
// Sender spends credits → receiver earns points
router.post('/gift', authMiddleware, async (req, res) => {
  const { matchId, receiverId, stickerId } = req.body;
  const senderId = req.user.id;

  if (!matchId || !receiverId || !stickerId) {
    return res.status(400).json({ error: 'matchId, receiverId, and stickerId are required.' });
  }
  if (senderId === receiverId) {
    return res.status(400).json({ error: 'Cannot send a gift to yourself.' });
  }

  try {
    // Verify sender is part of match
    const { data: match } = await supabase
      .from('matches')
      .select('id, user1_id, user2_id')
      .eq('id', matchId)
      .single();

    if (!match || (match.user1_id !== senderId && match.user2_id !== senderId)) {
      return res.status(403).json({ error: 'Not part of this match.' });
    }

    // Look up sticker details
    const { data: sticker, error: stickerErr } = await supabase
      .from('stickers')
      .select('id, name, icon, price_credits, point_value')
      .eq('id', stickerId)
      .single();

    if (stickerErr || !sticker) {
      return res.status(404).json({ error: 'Sticker not found.' });
    }

    // Check sender credits
    const { data: sender } = await supabase
      .from('users')
      .select('credits, points, name')
      .eq('id', senderId)
      .single();

    if (!sender || (sender.credits ?? 0) < sticker.price_credits) {
      return res.status(400).json({
        error: `Not enough credits. This gift costs ${sticker.price_credits} credits. You have ${sender?.credits ?? 0}.`,
      });
    }

    // Deduct credits from sender
    await supabase
      .from('users')
      .update({ credits: Math.max(0, (sender.credits ?? 0) - sticker.price_credits) })
      .eq('id', senderId);

    // Award points to receiver
    const { data: receiver } = await supabase
      .from('users')
      .select('points')
      .eq('id', receiverId)
      .single();

    await supabase
      .from('users')
      .update({ points: (receiver?.points ?? 0) + sticker.point_value })
      .eq('id', receiverId);

    // Log gift transaction (with sticker_id FK + emoji text + match_id)
    await supabase
      .from('gift_transactions')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        sticker_id: sticker.id,
        sticker: sticker.icon,  // emoji text for easy display
        match_id: matchId,
      });

    // Insert gift as a special chat message (emoji in content)
    const { data: giftMsg } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: senderId,
        content: `__GIFT__${sticker.icon}`,
      })
      .select('*')
      .single();

    // Broadcast to both users in real-time
    const io = req.app.get('io');
    if (io && giftMsg) {
      io.to(matchId).emit('newMessage', { ...giftMsg, reactions: [], is_deleted: false });
      io.to(matchId).emit('giftReceived', {
        sticker: sticker.icon,
        stickerName: sticker.name,
        senderName: sender.name,
        senderId,
        receiverId,
        pointsEarned: sticker.point_value,
        newCredits: Math.max(0, (sender.credits ?? 0) - sticker.price_credits),
      });
    }

    res.json({
      message: 'Gift sent!',
      newCredits: Math.max(0, (sender.credits ?? 0) - sticker.price_credits),
      pointsEarned: sticker.point_value,
      giftMessage: giftMsg,
    });
  } catch (err) {
    console.error('Gift error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /api/economy/gifts/:matchId ───────────────────────────────────────────
router.get('/gifts/:matchId', authMiddleware, async (req, res) => {
  const { matchId } = req.params;
  const userId = req.user.id;

  try {
    const { data: match } = await supabase
      .from('matches')
      .select('id, user1_id, user2_id')
      .eq('id', matchId)
      .single();

    if (!match || (match.user1_id !== userId && match.user2_id !== userId)) {
      return res.status(403).json({ error: 'Not part of this match.' });
    }

    const { data: gifts } = await supabase
      .from('gift_transactions')
      .select('id, sender_id, receiver_id, sticker, created_at, sticker_id')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })
      .limit(20);

    res.json({ gifts: gifts || [] });
  } catch (err) {
    console.error('Gift history error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
