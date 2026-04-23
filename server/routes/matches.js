const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ============================================
// POST /api/matches/request — Send a match request
// ============================================
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({ error: 'receiverId is required.' });
    }

    if (receiverId === senderId) {
      return res.status(400).json({ error: 'You cannot send a request to yourself.' });
    }

    // Check receiver exists
    const { data: receiver } = await supabase
      .from('users')
      .select('id')
      .eq('id', receiverId)
      .single();

    if (!receiver) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if already a match
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id')
      .or(
        `and(user1_id.eq.${senderId},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${senderId})`
      )
      .maybeSingle();

    if (existingMatch) {
      return res.status(409).json({ error: 'You are already matched with this user.' });
    }

    // Check for existing pending request (either direction)
    const { data: existingRequest } = await supabase
      .from('match_requests')
      .select('id, status, sender_id')
      .or(
        `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
      )
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest) {
      if (existingRequest.sender_id === senderId) {
        return res.status(409).json({ error: 'You already sent a request to this user.' });
      } else {
        // They sent us a request — auto-accept it
        const { error: updateErr } = await supabase
          .from('match_requests')
          .update({ status: 'accepted' })
          .eq('id', existingRequest.id);

        if (updateErr) throw updateErr;

        // Create match
        const { data: match, error: matchErr } = await supabase
          .from('matches')
          .insert({ user1_id: receiverId, user2_id: senderId })
          .select('id')
          .single();

        if (matchErr) throw matchErr;

        return res.json({
          message: 'Mutual interest! You are now matched.',
          matched: true,
          matchId: match.id,
        });
      }
    }

    // Create new request
    const { data: request, error } = await supabase
      .from('match_requests')
      .insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' })
      .select('id')
      .single();

    if (error) {
      console.error('Create request error:', error);
      return res.status(500).json({ error: 'Failed to send request.' });
    }

    res.status(201).json({ message: 'Match request sent!', requestId: request.id });
  } catch (err) {
    console.error('Send request error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// GET /api/matches/requests — List incoming & outgoing requests
// ============================================
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Incoming (pending)
    const { data: incoming, error: inErr } = await supabase
      .from('match_requests')
      .select('id, status, created_at, sender_id, sender:users!match_requests_sender_id_fkey(id, name, avatar_url, city, country, points)')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (inErr) throw inErr;

    // Outgoing (pending)
    const { data: outgoing, error: outErr } = await supabase
      .from('match_requests')
      .select('id, status, created_at, receiver_id, receiver:users!match_requests_receiver_id_fkey(id, name, avatar_url, city, country, points)')
      .eq('sender_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (outErr) throw outErr;

    res.json({ incoming: incoming || [], outgoing: outgoing || [] });
  } catch (err) {
    console.error('List requests error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// PUT /api/matches/respond — Accept or reject a request
// ============================================
router.put('/respond', authMiddleware, async (req, res) => {
  try {
    const { requestId, action } = req.body; // action: 'accept' | 'reject'
    const userId = req.user.id;

    if (!requestId || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'requestId and action (accept|reject) are required.' });
    }

    // Fetch the request — must be the receiver
    const { data: request, error: reqErr } = await supabase
      .from('match_requests')
      .select('id, sender_id, receiver_id, status')
      .eq('id', requestId)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .single();

    if (reqErr || !request) {
      return res.status(404).json({ error: 'Request not found or already handled.' });
    }

    if (action === 'reject') {
      await supabase
        .from('match_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      return res.json({ message: 'Request rejected.' });
    }

    // Accept — update request status and create match
    await supabase
      .from('match_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .insert({ user1_id: request.sender_id, user2_id: request.receiver_id })
      .select('id')
      .single();

    if (matchErr) {
      console.error('Create match error:', matchErr);
      return res.status(500).json({ error: 'Failed to create match.' });
    }

    res.json({ message: 'Match accepted! You are now connected.', matchId: match.id });
  } catch (err) {
    console.error('Respond error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// GET /api/matches — List all active matches
// ============================================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id,
        created_at,
        user1:users!matches_user1_id_fkey(id, name, avatar_url, city, country, bio, interests, points),
        user2:users!matches_user2_id_fkey(id, name, avatar_url, city, country, bio, interests, points)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Shape: return the "other" user from each match
    const shaped = (matches || []).map((m) => {
      const other = m.user1?.id === userId ? m.user2 : m.user1;
      return {
        matchId: m.id,
        createdAt: m.created_at,
        user: other,
      };
    });

    res.json({ matches: shaped });
  } catch (err) {
    console.error('List matches error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// DELETE /api/matches/:matchId — Unmatch
// ============================================
router.delete('/:matchId', authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;

    // Verify the user is part of this match
    const { data: match, error: fetchErr } = await supabase
      .from('matches')
      .select('id, user1_id, user2_id')
      .eq('id', matchId)
      .single();

    if (fetchErr || !match) {
      return res.status(404).json({ error: 'Match not found.' });
    }

    if (match.user1_id !== userId && match.user2_id !== userId) {
      return res.status(403).json({ error: 'Not authorised.' });
    }

    // Delete the match
    const { error: delErr } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);

    if (delErr) throw delErr;

    // Also clean up any associated accepted match_request rows
    await supabase
      .from('match_requests')
      .delete()
      .or(
        `and(sender_id.eq.${match.user1_id},receiver_id.eq.${match.user2_id}),and(sender_id.eq.${match.user2_id},receiver_id.eq.${match.user1_id})`
      );

    res.json({ message: 'Unmatched successfully.' });
  } catch (err) {
    console.error('Unmatch error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

