const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

const VALID_PURPOSES = ['Study', 'Coffee', 'Workout', 'Gaming', 'Hiking', 'Book Club', 'Language Exchange', 'Hangout'];

// ── GET /api/chat-rooms?city=&country= ──────────────────────────────────────
// Returns active rooms in the specified location
router.get('/', auth, async (req, res) => {
  const { city, country } = req.query;

  let query = supabase
    .from('chat_rooms')
    .select(`
      id, name, purpose, city, country, member_count, created_at,
      owner:owner_id ( id, name, avatar_url )
    `)
    .eq('status', 'active')
    .order('member_count', { ascending: false });

  if (city)    query = query.ilike('city', city);
  if (country) query = query.ilike('country', country);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Failed to fetch chat rooms.' });

  res.json({ rooms: data || [] });
});

// ── GET /api/chat-rooms/mine ─────────────────────────────────────────────────
// Returns the chat room owned by the current user (if any)
router.get('/mine', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('chat_rooms')
    .select('id, name, purpose, city, country, member_count, status, created_at')
    .eq('owner_id', req.user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Failed to fetch your room.' });
  res.json({ room: data });
});

// ── POST /api/chat-rooms ─────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const { name, purpose, city, country } = req.body;
  const ownerId = req.user.id;

  // Validate fields
  if (!name?.trim() || !purpose || !city?.trim() || !country?.trim()) {
    return res.status(400).json({ error: 'Name, purpose, city, and country are required.' });
  }
  if (!VALID_PURPOSES.includes(purpose)) {
    return res.status(400).json({ error: 'Invalid purpose.' });
  }
  if (name.trim().length < 3 || name.trim().length > 60) {
    return res.status(400).json({ error: 'Room name must be 3–60 characters.' });
  }

  // 1️⃣ One room per owner (globally — they may only own one active room)
  const { data: existing } = await supabase
    .from('chat_rooms')
    .select('id, city, country')
    .eq('owner_id', ownerId)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    return res.status(403).json({
      error: `You already own a chat room in ${existing.city}, ${existing.country}. Delete it before creating a new one.`,
    });
  }

  // 2️⃣ Unique name in location
  const { data: nameConflict } = await supabase
    .from('chat_rooms')
    .select('id')
    .ilike('city', city.trim())
    .ilike('country', country.trim())
    .ilike('name', name.trim())
    .eq('status', 'active')
    .maybeSingle();

  if (nameConflict) {
    return res.status(409).json({ error: 'A room with that name already exists in this location.' });
  }

  // 3️⃣ Unique purpose in location
  const { data: purposeConflict } = await supabase
    .from('chat_rooms')
    .select('id, name')
    .ilike('city', city.trim())
    .ilike('country', country.trim())
    .eq('purpose', purpose)
    .eq('status', 'active')
    .maybeSingle();

  if (purposeConflict) {
    return res.status(409).json({
      error: `A "${purpose}" room already exists in ${city}. Join "${purposeConflict.name}" instead!`,
    });
  }

  // 4️⃣ Create the room
  const { data: room, error: insertError } = await supabase
    .from('chat_rooms')
    .insert({
      owner_id: ownerId,
      name: name.trim(),
      purpose,
      city: city.trim(),
      country: country.trim(),
      status: 'active',
      member_count: 1,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('Chat room create error:', insertError);
    return res.status(500).json({ error: 'Failed to create chat room.' });
  }

  res.status(201).json({ room });

  // Auto-join the owner into room_members
  await supabase
    .from('room_members')
    .upsert({ room_id: room.id, user_id: ownerId }, { onConflict: 'room_id,user_id' });
});

// ── GET /api/chat-rooms/:id ───────────────────────────────────────────────────
// Returns a single room by ID
router.get('/:id', auth, async (req, res) => {
  const { data: room, error } = await supabase
    .from('chat_rooms')
    .select(`
      id, name, purpose, city, country, member_count, status, created_at,
      owner:owner_id ( id, name, avatar_url )
    `)
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Failed to fetch room.' });
  if (!room) return res.status(404).json({ error: 'Room not found.' });

  res.json({ room });
});

// ── DELETE /api/chat-rooms/:id ────────────────────────────────────────────────
// Only the owner can delete their room
router.delete('/:id', auth, async (req, res) => {
  const { data: room } = await supabase
    .from('chat_rooms')
    .select('id, owner_id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!room) return res.status(404).json({ error: 'Room not found.' });
  if (room.owner_id !== req.user.id) return res.status(403).json({ error: 'Only the owner can delete this room.' });

  await supabase
    .from('chat_rooms')
    .update({ status: 'archived' })
    .eq('id', req.params.id);

  res.json({ success: true });
});

// ── POST /api/chat-rooms/:id/join ─────────────────────────────────────────────
// Explicitly join a room (required before sending messages)
router.post('/:id/join', auth, async (req, res) => {
  const { data: room, error: roomErr } = await supabase
    .from('chat_rooms')
    .select('id, status')
    .eq('id', req.params.id)
    .eq('status', 'active')
    .maybeSingle();

  if (roomErr) return res.status(500).json({ error: 'Failed to check room.' });
  if (!room) return res.status(404).json({ error: 'Room not found or no longer active.' });

  const { error } = await supabase
    .from('room_members')
    .upsert({ room_id: req.params.id, user_id: req.user.id }, { onConflict: 'room_id,user_id' });

  if (error) {
    console.error('Join room error:', error);
    return res.status(500).json({ error: 'Failed to join room.' });
  }

  res.json({ success: true, joined: true });
});

// ── DELETE /api/chat-rooms/:id/leave ──────────────────────────────────────────
// Leave a room (removes from room_members; owner cannot leave, only delete)
router.delete('/:id/leave', auth, async (req, res) => {
  // Check if user is the owner — owners cannot leave, they must delete
  const { data: room } = await supabase
    .from('chat_rooms')
    .select('id, owner_id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (room && room.owner_id === req.user.id) {
    return res.status(403).json({ error: 'You are the owner. Delete the room instead of leaving.' });
  }

  const { error } = await supabase
    .from('room_members')
    .delete()
    .eq('room_id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) {
    console.error('Leave room error:', error);
    return res.status(500).json({ error: 'Failed to leave room.' });
  }

  res.json({ success: true, joined: false });
});

// ── GET /api/chat-rooms/:id/membership ────────────────────────────────────────
// Check if the current user is a member of this room
router.get('/:id/membership', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('room_members')
    .select('id')
    .eq('room_id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Failed to check membership.' });
  res.json({ isMember: !!data });
});

// ── GET /api/chat-rooms/:id/members ──────────────────────────────────────────
// Returns all members of a room (owner only)
router.get('/:id/members', auth, async (req, res) => {
  // Verify requester is the owner
  const { data: room } = await supabase
    .from('chat_rooms')
    .select('id, owner_id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!room) return res.status(404).json({ error: 'Room not found.' });
  if (room.owner_id !== req.user.id) return res.status(403).json({ error: 'Only the owner can view the members list.' });

  const { data, error } = await supabase
    .from('room_members')
    .select(`
      joined_at,
      user:user_id ( id, name, avatar_url, city, country )
    `)
    .eq('room_id', req.params.id)
    .order('joined_at', { ascending: true });

  if (error) return res.status(500).json({ error: 'Failed to fetch members.' });
  res.json({ members: data || [] });
});

// ── DELETE /api/chat-rooms/:id/members/:userId ────────────────────────────────
// Owner kicks a member from the room
router.delete('/:id/members/:userId', auth, async (req, res) => {
  const { id: roomId, userId: targetUserId } = req.params;

  // Verify requester is the owner
  const { data: room } = await supabase
    .from('chat_rooms')
    .select('id, owner_id')
    .eq('id', roomId)
    .maybeSingle();

  if (!room) return res.status(404).json({ error: 'Room not found.' });
  if (room.owner_id !== req.user.id) return res.status(403).json({ error: 'Only the owner can kick members.' });
  if (targetUserId === req.user.id) return res.status(400).json({ error: 'You cannot kick yourself.' });

  const { error } = await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', targetUserId);

  if (error) {
    console.error('Kick member error:', error);
    return res.status(500).json({ error: 'Failed to kick member.' });
  }

  // Emit socket event to notify the kicked user (via io attached to app)
  const io = req.app.get('io');
  if (io) {
    io.to(`room:${roomId}`).emit('roomMemberKicked', { userId: targetUserId, roomId });
  }

  res.json({ success: true });
});

// ── GET /api/chat-rooms/:id/messages ─────────────────────────────────────────
router.get('/:id/messages', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('room_messages')
    .select(`
      id, content, created_at, is_deleted,
      sender:sender_id ( id, name, avatar_url )
    `)
    .eq('room_id', req.params.id)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) return res.status(500).json({ error: 'Failed to fetch messages.' });
  res.json({ messages: data || [] });
});

module.exports = router;
