const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { moderateMessage } = require('../lib/moderation');

const EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

/** Helper: fetch grouped reactions for a message */
async function getReactions(messageId) {
  const { data } = await supabase
    .from('message_reactions')
    .select('emoji, user_id')
    .eq('message_id', messageId);

  const grouped = {};
  for (const row of data || []) {
    if (!grouped[row.emoji]) grouped[row.emoji] = [];
    grouped[row.emoji].push(row.user_id);
  }
  return Object.entries(grouped).map(([emoji, user_ids]) => ({
    emoji,
    user_ids,
    count: user_ids.length,
  }));
}

/** Helper: verify a user is part of a match */
async function verifyMember(matchId, userId) {
  const { data: match } = await supabase
    .from('matches')
    .select('id, user1_id, user2_id')
    .eq('id', matchId)
    .single();
  if (!match) return null;
  if (match.user1_id !== userId && match.user2_id !== userId) return null;
  return match;
}

function registerChatHandlers(io) {
  // ── JWT auth middleware ─────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`⚡ Socket connected: ${socket.id} (user ${socket.userId})`);

    // ── joinRoom ────────────────────────────────────────────────────────────
    socket.on('joinRoom', async ({ matchId }) => {
      if (!matchId) return;
      const match = await verifyMember(matchId, socket.userId);
      if (!match) return socket.emit('error', { message: 'Not part of this match.' });
      socket.join(matchId);
      console.log(`👥 User ${socket.userId} joined room ${matchId}`);
    });

    // ── sendMessage ─────────────────────────────────────────────────────────
    socket.on('sendMessage', async ({ matchId, content }) => {
      if (!matchId || !content?.trim()) return;
      const match = await verifyMember(matchId, socket.userId);
      if (!match) return socket.emit('error', { message: 'Unauthorised.' });

      // ── AI Safety Shield ──────────────────────────────────────────────────
      const { safe, reason } = await moderateMessage(content.trim());
      if (!safe) {
        // Notify sender — message is dropped, never stored or broadcast
        socket.emit('messageFlagged', {
          reason,
          content: content.trim(),
        });
        // Increment warnings counter for this user
        supabase
          .from('users')
          .select('warnings')
          .eq('id', socket.userId)
          .single()
          .then(({ data }) => {
            const current = data?.warnings ?? 0;
            supabase
              .from('users')
              .update({ warnings: current + 1 })
              .eq('id', socket.userId)
              .then(() => {})
              .catch(() => {});
          })
          .catch(() => {});
        return; // Do NOT proceed to insert
      }
      // ─────────────────────────────────────────────────────────────────────

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: socket.userId,
          content: content.trim(),
        })
        .select('*')
        .single();

      if (error) {
        console.error('Message insert error:', error);
        return socket.emit('error', { message: 'Failed to send message.' });
      }

      io.to(matchId).emit('newMessage', { ...message, reactions: [], is_deleted: false });
    });

    // ── deleteMessage ───────────────────────────────────────────────────────
    // Client emits: { messageId, matchId }
    socket.on('deleteMessage', async ({ messageId, matchId }) => {
      if (!messageId || !matchId) return;

      // Verify ownership
      const { data: msg } = await supabase
        .from('messages')
        .select('id, sender_id, match_id')
        .eq('id', messageId)
        .single();

      if (!msg || msg.sender_id !== socket.userId) {
        return socket.emit('error', { message: 'Cannot delete this message.' });
      }

      // Soft-delete
      await supabase
        .from('messages')
        .update({ is_deleted: true, content: 'This message was deleted.' })
        .eq('id', messageId);

      io.to(matchId).emit('messageDeleted', { messageId });
    });

    // ── react ───────────────────────────────────────────────────────────────
    // Client emits: { messageId, matchId, emoji }
    // Toggles the reaction: adds if not present, removes if already added
    socket.on('react', async ({ messageId, matchId, emoji }) => {
      if (!messageId || !matchId || !emoji) return;
      if (!EMOJIS.includes(emoji)) return socket.emit('error', { message: 'Invalid emoji.' });

      const match = await verifyMember(matchId, socket.userId);
      if (!match) return socket.emit('error', { message: 'Unauthorised.' });

      // Check existing reaction
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', socket.userId)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        // Remove reaction
        await supabase.from('message_reactions').delete().eq('id', existing.id);
      } else {
        // Add reaction
        await supabase.from('message_reactions').insert({
          message_id: messageId,
          user_id: socket.userId,
          emoji,
        });
      }

      const reactions = await getReactions(messageId);
      io.to(matchId).emit('reactionUpdated', { messageId, reactions });
    });

    // ── typing ──────────────────────────────────────────────────────────────
    socket.on('typing', ({ matchId, isTyping }) => {
      if (!matchId) return;
      socket.to(matchId).emit('partnerTyping', { userId: socket.userId, isTyping });
    });

    // ══════════════════════════════════════════════════════════════════════
    // SOUL CANVAS — ephemeral real-time drawing (no DB writes)
    // ══════════════════════════════════════════════════════════════════════

    // canvasJoin — user enters the canvas room for a match
    socket.on('canvasJoin', async ({ matchId }) => {
      if (!matchId) return;
      const match = await verifyMember(matchId, socket.userId);
      if (!match) return socket.emit('error', { message: 'Not part of this match.' });

      const roomName = `canvas:${matchId}`;

      // Check if partner is ALREADY in the canvas room before this user joins
      const room = io.sockets.adapter.rooms.get(roomName);
      const partnerAlreadyHere = room && room.size > 0;

      socket.join(roomName);

      // Notify partner (already on canvas) that this user joined
      socket.to(roomName).emit('canvasPartnerJoined', { userId: socket.userId });

      // FIX: If partner was already in the room, immediately tell the joiner too
      if (partnerAlreadyHere) {
        socket.emit('canvasPartnerJoined', { userId: 'partner' });
      }

      // One-time invite: also notify partner via the CHAT room (if they're on chat page, not canvas)
      // Only emit this when 'first person' opens canvas (room was empty before join)
      if (!partnerAlreadyHere) {
        socket.to(matchId).emit('canvasOpened', { userId: socket.userId });
      }

      console.log(`🎨 User ${socket.userId} joined canvas room ${roomName} (partner was ${partnerAlreadyHere ? 'already here' : 'not here'})`);
    });

    // canvasDraw — broadcast a stroke to room partner only (not sender)
    // stroke: { tool, color, lineWidth, points: [{x,y}] }
    socket.on('canvasDraw', ({ matchId, stroke }) => {
      if (!matchId || !stroke) return;
      socket.to(`canvas:${matchId}`).emit('canvasStroke', { stroke });
    });

    // canvasClear — broadcast clear to partner
    socket.on('canvasClear', ({ matchId }) => {
      if (!matchId) return;
      socket.to(`canvas:${matchId}`).emit('canvasCleared');
    });

    // canvasLeave — user leaves canvas room
    socket.on('canvasLeave', ({ matchId }) => {
      if (!matchId) return;
      socket.leave(`canvas:${matchId}`);
      socket.to(`canvas:${matchId}`).emit('canvasPartnerLeft', { userId: socket.userId });
      console.log(`🎨 User ${socket.userId} left canvas room canvas:${matchId}`);
    });

    // canvasAiPrompt — broadcast AI-generated prompt to BOTH users in canvas + chat rooms
    socket.on('canvasAiPrompt', ({ matchId, prompt }) => {
      if (!matchId || !prompt) return;
      io.to(`canvas:${matchId}`).emit('canvasAiPromptSet', { prompt });
      io.to(matchId).emit('canvasAiPromptSet', { prompt });
    });

    // canvasEnd — one user ends the session for BOTH (like hanging up a call)
    socket.on('canvasEnd', ({ matchId }) => {
      if (!matchId) return;
      const roomName = `canvas:${matchId}`;
      // Notify ALL users in the canvas room (including sender) so everyone navigates away
      io.to(roomName).emit('canvasEnded', { by: socket.userId });
      // Remove all sockets from the canvas room
      const room = io.sockets.adapter.rooms.get(roomName);
      if (room) {
        for (const socketId of room) {
          const s = io.sockets.sockets.get(socketId);
          if (s) s.leave(roomName);
        }
      }
      console.log(`🎨 Canvas session ended by user ${socket.userId} in room ${roomName}`);
    });

    // ══════════════════════════════════════════════════════════════════════
    // COMMUNITY CHAT ROOMS — location-based group chat
    // ══════════════════════════════════════════════════════════════════════

    // roomJoin — user joins a community chat room
    socket.on('roomJoin', async ({ roomId }) => {
      if (!roomId) return;

      // Verify room exists and is active (graceful on DB errors)
      const { data: room, error: roomErr } = await supabase
        .from('chat_rooms')
        .select('id, status')
        .eq('id', roomId)
        .eq('status', 'active')
        .maybeSingle();

      if (roomErr) {
        // DB temporarily unavailable — still allow join but log it
        console.warn(`⚠️  DB error on roomJoin for room ${roomId}:`, roomErr.message);
      } else if (!room) {
        // Room genuinely not found / archived
        return socket.emit('roomError', { message: 'Room not found or has been deleted.' });
      }

      const roomKey = `room:${roomId}`;
      socket.join(roomKey);

      // Best-effort DB updates (never block join)
      supabase.rpc('increment_room_members', { room_id: roomId }).then(null, () => {});
      supabase
        .from('chat_rooms')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', roomId)
        .then(null, () => {});

      socket.to(roomKey).emit('roomMemberJoined', { userId: socket.userId });
      console.log(`🏠 User ${socket.userId} joined room ${roomKey}`);
    });

    // roomLeave — user leaves a community chat room
    socket.on('roomLeave', async ({ roomId }) => {
      if (!roomId) return;
      const roomKey = `room:${roomId}`;
      socket.leave(roomKey);
      supabase.rpc('decrement_room_members', { room_id: roomId }).then(null, () => {});
      socket.to(roomKey).emit('roomMemberLeft', { userId: socket.userId });
    });

    // roomMessage — send a message to a community chat room
    socket.on('roomMessage', async ({ roomId, content }) => {
      if (!roomId || !content?.trim()) return;

      // Verify room is active (graceful on DB errors)
      const { data: room, error: roomErr } = await supabase
        .from('chat_rooms')
        .select('id, status')
        .eq('id', roomId)
        .eq('status', 'active')
        .maybeSingle();

      if (!roomErr && !room) {
        return socket.emit('roomError', { message: 'Room not found or has been deleted.' });
      }

      // ── Membership gate: user must have explicitly joined ─────────────────
      const { data: membership } = await supabase
        .from('room_members')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', socket.userId)
        .maybeSingle();

      if (!membership) {
        return socket.emit('roomError', { message: 'You must join this room before sending messages.' });
      }

      // AI safety moderation
      const { safe, reason } = await moderateMessage(content.trim());
      if (!safe) {
        socket.emit('messageFlagged', { reason, content: content.trim() });
        return;
      }

      // Persist message
      const { data: message, error } = await supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          sender_id: socket.userId,
          content: content.trim(),
        })
        .select(`
          id, content, created_at, is_deleted,
          sender:sender_id ( id, name, avatar_url )
        `)
        .single();

      if (error) {
        console.error('Room message error:', error);
        return socket.emit('roomError', { message: 'Failed to send message. Please try again.' });
      }

      supabase
        .from('chat_rooms')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', roomId)
        .then(null, () => {});

      io.to(`room:${roomId}`).emit('roomNewMessage', message);
    });

    // roomTyping — broadcast typing indicator within a room
    socket.on('roomTyping', ({ roomId, isTyping }) => {
      if (!roomId) return;
      socket.to(`room:${roomId}`).emit('roomPartnerTyping', { userId: socket.userId, isTyping });
    });

    // roomDeleted — owner deleted the room; kick all members
    socket.on('roomDeleted', async ({ roomId }) => {
      if (!roomId) return;

      const { data: room, error } = await supabase
        .from('chat_rooms')
        .select('id, owner_id')
        .eq('id', roomId)
        .maybeSingle();

      // Only broadcast if we can verify ownership (skip on DB error)
      if (error || !room || room.owner_id !== socket.userId) return;

      const roomKey = `room:${roomId}`;
      io.to(roomKey).emit('roomDeleted');
      console.log(`🏠 Room ${roomId} deleted by owner ${socket.userId}; all members kicked`);
    });

    // ── disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id} (user ${socket.userId})`);
    });
  });
}

module.exports = registerChatHandlers;
