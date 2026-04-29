'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft, Send, Loader2, Users, MapPin, Wifi, WifiOff,
  BookOpen, Coffee, Dumbbell, Gamepad2, Mountain, BookMarked, Languages, PartyPopper,
  Trash2, AlertCircle, LogOut, X, UserX, ShieldAlert, ChevronRight,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const PURPOSE_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'Study': BookOpen,  'Coffee': Coffee,    'Workout': Dumbbell,
  'Gaming': Gamepad2, 'Hiking': Mountain,  'Book Club': BookMarked,
  'Language Exchange': Languages,          'Hangout': PartyPopper,
};
const PURPOSE_COLORS: Record<string, string> = {
  'Study': '#5B6AF0',  'Coffee': '#D4A853',  'Workout': '#E8604C',
  'Gaming': '#9B5DE5', 'Hiking': '#2AB5A0',  'Book Club': '#06D6A0',
  'Language Exchange': '#FB8500',            'Hangout': '#F72585',
};

type RoomMessage = {
  id: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
  sender: { id: string; name: string; avatar_url?: string | null };
};

type Room = {
  id: string;
  name: string;
  purpose: string;
  city: string;
  country: string;
  member_count: number;
  status: string;
  owner: { id: string; name: string; avatar_url?: string | null };
};

type RoomMember = {
  joined_at: string;
  user: { id: string; name: string; avatar_url?: string | null; city?: string; country?: string };
};

function Avatar({ name, avatar_url, size = 8 }: { name: string; avatar_url?: string | null; size?: number }) {
  const hue = name ? name.charCodeAt(0) * 137 : 0;
  const bg = `hsl(${hue % 360}, 60%, 55%)`;
  const dim = `${size * 4}px`;
  if (avatar_url) return <img src={avatar_url} alt={name} className="rounded-full object-cover shrink-0" style={{ width: dim, height: dim }} />;
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: dim, height: dim, background: bg, fontSize: size < 8 ? 10 : 13 }}>
      {name?.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({
  open, onConfirm, onCancel, title, message, confirmLabel, dangerous,
}: {
  open: boolean; onConfirm: () => void; onCancel: () => void;
  title: string; message: string; confirmLabel: string; dangerous?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="w-full max-w-sm rounded-2xl p-6"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: dangerous ? 'rgba(239,68,68,0.1)' : 'rgba(124,58,237,0.1)' }}>
              {dangerous
                ? <Trash2 className="w-6 h-6" style={{ color: '#EF4444' }} />
                : <LogOut className="w-6 h-6" style={{ color: '#7C3AED' }} />}
            </div>
            <h3 className="text-base font-bold text-center mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--text-muted)' }}>{message}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                style={{
                  background: dangerous ? '#EF4444' : '#7C3AED',
                  color: 'white',
                  boxShadow: dangerous ? '0 4px 12px rgba(239,68,68,0.35)' : '0 4px 12px rgba(124,58,237,0.35)',
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [room, setRoom]         = useState<Room | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [input, setInput]       = useState('');
  const [connected, setConnected]     = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [flaggedMsg, setFlaggedMsg]   = useState('');
  const [socketError, setSocketError] = useState('');
  const [isMember, setIsMember]       = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  // Members panel (owner only)
  const [showMembers, setShowMembers]   = useState(false);
  const [members, setMembers]           = useState<RoomMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [kickingId, setKickingId]       = useState<string | null>(null);

  // Confirmation dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm]   = useState(false);
  const [actionLoading, setActionLoading]         = useState(false);

  const socketRef   = useRef<Socket | null>(null);
  const bottomRef   = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomIdRef   = useRef(roomId);
  const joinedRef   = useRef(false); // true once socket successfully joined the room
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // ── Load room info + messages ───────────────────────────────────────────────
  useEffect(() => {
    if (!token || !roomId) return;
    setLoading(true);

    Promise.all([
      api<{ room: Room }>(`/api/chat-rooms/${roomId}`, { token }),
      api<{ messages: RoomMessage[] }>(`/api/chat-rooms/${roomId}/messages`, { token }),
    ])
      .then(([roomData, msgData]) => {
        setRoom(roomData.room);
        setMemberCount(roomData.room.member_count);
        setMessages(msgData.messages ?? []);
        // Owner is always a member — check membership separately (non-blocking)
        const isOwnerNow = roomData.room.owner.id === user?.id;
        if (isOwnerNow) {
          setIsMember(true);
        } else {
          api<{ isMember: boolean }>(`/api/chat-rooms/${roomId}/membership`, { token })
            .then((d) => setIsMember(d.isMember))
            .catch(() => setIsMember(false)); // gracefully default to not a member
        }
      })
      .catch(() => setError('Failed to load room. It may have been deleted or you have no access.'))
      .finally(() => setLoading(false));
  }, [token, roomId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Socket connection ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !roomId) return;
    joinedRef.current = false;

    const socket = io(API_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      setConnected(true);
      setSocketError('');
      socket.emit('roomJoin', { roomId: roomIdRef.current });
      joinedRef.current = true;
    });
    socket.on('disconnect', () => {
      setConnected(false);
      joinedRef.current = false;
    });

    // Server-side room errors (NOT the reserved socket 'error' event)
    socket.on('roomError', ({ message }: { message: string }) => {
      setSocketError(message);
      setTimeout(() => setSocketError(''), 5000);
    });

    // Low-level connection error (wrong token, network, etc.)
    socket.on('connect_error', (err) => {
      console.error('Socket connect_error:', err.message);
      setConnected(false);
    });

    socket.on('roomNewMessage', (msg: RoomMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('roomMemberJoined', () => setMemberCount((c) => c + 1));
    socket.on('roomMemberLeft',   () => setMemberCount((c) => Math.max(0, c - 1)));

    // Kicked: if it's this user, lose membership and redirect
    socket.on('roomMemberKicked', ({ userId: kickedId }: { userId: string; roomId: string }) => {
      // Remove from local members list (for owner's view)
      setMembers((prev) => prev.filter((m) => m.user.id !== kickedId));
      setMemberCount((c) => Math.max(0, c - 1));
      // If the kicked user IS the current user (use auth context id)
      if (kickedId === user?.id) {
        setIsMember(false);
        setSocketError('You have been removed from this room by the owner.');
      }
    });

    socket.on('roomPartnerTyping', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) =>
        isTyping ? (prev.includes(userId) ? prev : [...prev, userId]) : prev.filter((id) => id !== userId)
      );
    });

    socket.on('messageFlagged', ({ reason }: { reason: string }) => {
      setFlaggedMsg(reason || 'Message flagged by AI moderation.');
      setTimeout(() => setFlaggedMsg(''), 4000);
    });

    // Room deleted by owner — only redirect if we actually joined
    socket.on('roomDeleted', () => {
      if (joinedRef.current) router.push('/discover');
    });

    socketRef.current = socket;
    return () => {
      joinedRef.current = false;
      socket.emit('roomLeave', { roomId: roomIdRef.current });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, roomId, router]);

  const sendMessage = useCallback(() => {
    const content = input.trim();
    if (!content || !socketRef.current) return;
    socketRef.current.emit('roomMessage', { roomId, content });
    setInput('');
  }, [input, roomId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleTyping = (val: string) => {
    setInput(val);
    socketRef.current?.emit('roomTyping', { roomId, isTyping: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('roomTyping', { roomId, isTyping: false });
    }, 1500);
  };

  // ── Delete room (owner only) ────────────────────────────────────────────────
  const handleDeleteRoom = async () => {
    if (!token || !room || room.owner.id !== user?.id) return;
    setActionLoading(true);
    try {
      await api(`/api/chat-rooms/${roomId}`, { method: 'DELETE', token });
      // Notify all socket members
      socketRef.current?.emit('roomDeleted', { roomId });
      router.push('/discover');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete room.');
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // ── Load members (owner only) ───────────────────────────────────────────────
  const loadMembers = async () => {
    if (!token || !isOwner) return;
    setMembersLoading(true);
    try {
      const data = await api<{ members: RoomMember[] }>(`/api/chat-rooms/${roomId}/members`, { token });
      setMembers(data.members ?? []);
    } catch { /* silently fail */ }
    finally { setMembersLoading(false); }
  };

  const handleOpenMembers = () => {
    setShowMembers(true);
    loadMembers();
  };

  // ── Kick member (owner only) ─────────────────────────────────────────────────
  const handleKickMember = async (targetUserId: string) => {
    if (!token || kickingId) return;
    setKickingId(targetUserId);
    try {
      await api(`/api/chat-rooms/${roomId}/members/${targetUserId}`, { method: 'DELETE', token });
      // Socket event will update the list via roomMemberKicked
    } catch (err: unknown) {
      setSocketError(err instanceof Error ? err.message : 'Failed to kick member.');
    } finally {
      setKickingId(null);
    }
  };

  // ── Join room ──────────────────────────────────────────────────────────────
  const handleJoinRoom = async () => {
    if (!token || joinLoading) return;
    setJoinLoading(true);
    try {
      await api(`/api/chat-rooms/${roomId}/join`, { method: 'POST', token });
      setIsMember(true);
    } catch (err: unknown) {
      setSocketError(err instanceof Error ? err.message : 'Failed to join room.');
    } finally {
      setJoinLoading(false);
    }
  };

  // ── Leave room (non-owner) ──────────────────────────────────────────────────
  const handleLeaveRoom = async () => {
    if (!token) return;
    try {
      await api(`/api/chat-rooms/${roomId}/leave`, { method: 'DELETE', token });
    } catch { /* best-effort */ }
    setIsMember(false);
    socketRef.current?.emit('roomLeave', { roomId });
    router.push('/discover');
  };

  const color = PURPOSE_COLORS[room?.purpose ?? ''] ?? '#7C3AED';
  const PurposeIcon = PURPOSE_ICONS[room?.purpose ?? ''] ?? BookOpen;
  const isOwner = room?.owner.id === user?.id;

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3" style={{ height: 'calc(100vh - 64px)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7C3AED' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading room…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.1)' }}>
          <AlertCircle className="w-7 h-7" style={{ color: '#EF4444' }} />
        </div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{error}</p>
        <Link href="/discover" className="btn-primary px-5 py-2 text-sm">Back to Discover</Link>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col"
      style={{ height: 'calc(100vh - 64px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* Confirm dialogs */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this room?"
        message="All messages will be permanently lost. Everyone in the room will be removed. This cannot be undone."
        confirmLabel={actionLoading ? 'Deleting…' : 'Delete Room'}
        dangerous
        onConfirm={handleDeleteRoom}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      <ConfirmDialog
        open={showLeaveConfirm}
        title="Leave this room?"
        message="You can always rejoin this room later from the Discover page."
        confirmLabel="Leave Room"
        onConfirm={handleLeaveRoom}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>

        {/* Back button — navigates away without leaving the room */}
        <button
          type="button"
          onClick={() => router.push('/discover')}
          title="Back to Discover"
          className="p-1.5 rounded-lg transition-colors cursor-pointer"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Purpose icon */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}20` }}>
          <PurposeIcon className="w-4 h-4" style={{ color }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-none truncate" style={{ color: 'var(--text-primary)' }}>
            {room?.name ?? 'Community Room'}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-medium" style={{ color }}>{room?.purpose}</span>
            {(room?.city || room?.country) && (
              <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <MapPin className="w-3 h-3" />
                {[room.city, room.country].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Member count — clickable for owner to open members panel */}
          <button
            type="button"
            onClick={isOwner ? handleOpenMembers : undefined}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${isOwner ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
            style={{ background: isOwner ? `${color}18` : 'var(--bg-elevated)', color: isOwner ? color : 'var(--text-muted)', border: isOwner ? `1px solid ${color}35` : 'none' }}
            title={isOwner ? 'View members' : undefined}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="font-semibold">{memberCount}</span>
            {isOwner && <ChevronRight className="w-3 h-3" />}
          </button>

          {/* Connection indicator */}
          {connected
            ? <Wifi className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
            : <WifiOff className="w-3.5 h-3.5" style={{ color: 'var(--color-error)' }} />}

          {/* Owner: delete button */}
          {isOwner && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={actionLoading}
              title="Delete room"
              className="p-1.5 rounded-xl cursor-pointer transition-colors"
              style={{ color: 'var(--color-error)', background: 'rgba(239,68,68,0.08)' }}
            >
              {actionLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Non-owner: leave button */}
          {!isOwner && (
            <button
              type="button"
              onClick={() => setShowLeaveConfirm(true)}
              title="Leave room"
              className="p-1.5 rounded-xl cursor-pointer transition-colors"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Owner badge */}
      {isOwner && (
        <div className="shrink-0 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold"
          style={{ background: `${color}10`, borderBottom: `1px solid ${color}30`, color }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          You are the owner of this room
        </div>
      )}

      {/* ── Messages ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ background: 'var(--bg-page)', scrollbarWidth: 'none' }}>

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: `${color}15` }}>
              <PurposeIcon className="w-7 h-7" style={{ color }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Start the conversation!
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Be the first to say hello in this room.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.sender.id === user?.id;
          const showAvatar = !isOwn && (i === 0 || messages[i - 1]?.sender.id !== msg.sender.id);
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {!isOwn && (
                <div className="w-7 h-7 shrink-0">
                  {showAvatar && <Avatar name={msg.sender.name} avatar_url={msg.sender.avatar_url} size={7} />}
                </div>
              )}
              <div className={`max-w-[72%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {showAvatar && !isOwn && (
                  <span className="text-xs font-semibold ml-1" style={{ color: 'var(--text-muted)' }}>
                    {msg.sender.name}
                  </span>
                )}
                <div
                  className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={
                    isOwn
                      ? { background: color, color: 'white', borderBottomRightRadius: 6 }
                      : { background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderBottomLeftRadius: 6 }
                  }
                >
                  {msg.is_deleted ? (
                    <span className="italic opacity-60">Message deleted</span>
                  ) : (
                    msg.content
                  )}
                </div>
                <span className="text-[10px] px-1" style={{ color: 'var(--text-muted)' }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-2">
            <div className="flex gap-1">
              {[0,1,2].map((i) => (
                <motion.div key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: color }}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {typingUsers.length === 1 ? 'Someone is' : 'People are'} typing…
            </span>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Socket / room error alert ──────────────────────────── */}
      <AnimatePresence>
        {socketError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="shrink-0 flex items-center gap-2 px-4 py-2 text-xs"
            style={{
              background: 'rgba(251,133,0,0.08)',
              borderTop: '1px solid rgba(251,133,0,0.25)',
              color: '#FB8500',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {socketError}
            <button type="button" onClick={() => setSocketError('')} className="ml-auto cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Flagged message alert ─────────────────────────────── */}
      <AnimatePresence>
        {flaggedMsg && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="shrink-0 flex items-center gap-2 px-4 py-2 text-xs"
            style={{
              background: 'rgba(239,68,68,0.08)',
              borderTop: '1px solid rgba(239,68,68,0.2)',
              color: '#EF4444',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {flaggedMsg}
            <button type="button" onClick={() => setFlaggedMsg('')} className="ml-auto cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── Members Panel (owner only) ────────────────────────── */}
      <AnimatePresence>
        {showMembers && isOwner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowMembers(false)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: '0 24px 64px rgba(0,0,0,0.35)', maxHeight: '80vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Panel header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                  <ShieldAlert className="w-4.5 h-4.5" style={{ color }} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Room Members</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{members.length} joined · tap to kick</p>
                </div>
                <button type="button" onClick={() => setShowMembers(false)} className="p-1.5 rounded-lg cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Members list */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 80px)', scrollbarWidth: 'none' }}>
                {membersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color }} />
                  </div>
                ) : members.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Users className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No members yet</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                    {members.map((m) => {
                      const isRoomOwner = m.user.id === room?.owner.id;
                      const isKicking = kickingId === m.user.id;
                      return (
                        <motion.div
                          key={m.user.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-center gap-3 px-5 py-3"
                        >
                          <Avatar name={m.user.name} avatar_url={m.user.avatar_url} size={9} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{m.user.name}</p>
                              {isRoomOwner && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>Owner</span>
                              )}
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              Joined {new Date(m.joined_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          {!isRoomOwner && (
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleKickMember(m.user.id)}
                              disabled={!!kickingId}
                              title={`Kick ${m.user.name}`}
                              className="p-2 rounded-xl cursor-pointer transition-all disabled:opacity-50"
                              style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}
                            >
                              {isKicking
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <UserX className="w-3.5 h-3.5" />}
                            </motion.button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Join Banner (non-members) ────────────────────────── */}
      <AnimatePresence>
        {!isMember && !isOwner && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="shrink-0 px-4 py-3 border-t"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
          >
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                background: `${color}12`,
                border: `1.5px solid ${color}35`,
              }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}20` }}>
                <Users className="w-4 h-4" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Join to participate
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  You can read messages, but must join to send.
                </p>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleJoinRoom}
                disabled={joinLoading}
                className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all disabled:opacity-60"
                style={{ background: color, color: 'white', boxShadow: `0 4px 14px ${color}45` }}
              >
                {joinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Room'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input bar (members only) ────────────────────────── */}
      {(isMember || isOwner) && (
        <div className="shrink-0 flex items-end gap-2 px-4 py-3 border-t"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <textarea
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Say something…"
            rows={1}
            className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
            style={{
              background: 'var(--bg-elevated)',
              border: '1.5px solid var(--border-default)',
              color: 'var(--text-primary)',
              maxHeight: 120,
              lineHeight: '1.5',
            }}
            onFocus={(e) => { (e.target as HTMLElement).style.borderColor = color; }}
            onBlur={(e) => { (e.target as HTMLElement).style.borderColor = 'var(--border-default)'; }}
          />
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={sendMessage}
            disabled={!input.trim() || !connected}
            className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer shrink-0 transition-all disabled:opacity-40"
            style={{ background: color, color: 'white' }}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
