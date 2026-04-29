'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MessageCircle, X, Users, MapPin, Plus, Radar,
  BookOpen, Coffee, Dumbbell, Gamepad2, Mountain, BookMarked, Languages, PartyPopper,
} from 'lucide-react';
import { io } from 'socket.io-client';
import CreateRoomModal from '@/components/CreateRoomModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type Conversation = {
  matchId: string;
  user: { id: string; name: string; avatar_url?: string | null };
  lastMessage: { content: string; created_at: string; sender_id: string } | null;
  unreadCount: number;
  matchedAt?: string;
};

type ChatRoom = {
  id: string;
  name: string;
  purpose: string;
  city: string;
  country: string;
  member_count: number;
  owner: { id: string; name: string; avatar_url?: string | null };
};

const PURPOSE_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'Study': BookOpen, 'Coffee': Coffee, 'Workout': Dumbbell, 'Gaming': Gamepad2,
  'Hiking': Mountain, 'Book Club': BookMarked, 'Language Exchange': Languages, 'Hangout': PartyPopper,
};
const PURPOSE_COLORS: Record<string, string> = {
  'Study': '#5B6AF0', 'Coffee': '#D4A853', 'Workout': '#E8604C', 'Gaming': '#9B5DE5',
  'Hiking': '#2AB5A0', 'Book Club': '#06D6A0', 'Language Exchange': '#FB8500', 'Hangout': '#F72585',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Avatar({ name, avatar_url, size = 10 }: { name: string; avatar_url?: string | null; size?: number }) {
  const hue = name ? name.charCodeAt(0) * 137 : 0;
  const bg = `hsl(${hue % 360}, 60%, 55%)`;
  const dim = `${size * 4}px`;
  if (avatar_url) return <img src={avatar_url} alt={name} className="rounded-full object-cover shrink-0" style={{ width: dim, height: dim }} />;
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: dim, height: dim, background: bg, fontSize: size < 9 ? '0.8rem' : '1rem' }}>
      {name?.charAt(0).toUpperCase()}
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Conversation row ─────────────────────────────────────────────────────────

function ConvRow({ conv, isActive }: { conv: Conversation; isActive: boolean }) {
  return (
    <Link href={`/chat/${conv.matchId}`}
      className="flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors relative"
      style={{
        background: isActive ? 'var(--color-brand-subtle)' : 'transparent',
        borderLeft: isActive ? '3px solid var(--color-brand)' : '3px solid transparent',
      }}>
      <div className="relative shrink-0">
        <Avatar name={conv.user?.name ?? '?'} avatar_url={conv.user?.avatar_url} size={10} />
        {conv.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ background: 'var(--color-brand)', color: 'white' }}>
            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-semibold text-sm truncate"
            style={{ color: isActive ? 'var(--color-brand)' : 'var(--text-primary)' }}>
            {conv.user?.name ?? 'Unknown'}
          </p>
          {conv.lastMessage && (
            <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>
              {formatTime(conv.lastMessage.created_at)}
            </span>
          )}
        </div>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {conv.lastMessage
            ? conv.lastMessage.content.startsWith('This message was deleted')
              ? '🚫 Message deleted'
              : conv.lastMessage.content
            : 'No messages yet'}
        </p>
      </div>
    </Link>
  );
}

// ─── Room row ─────────────────────────────────────────────────────────────────

function RoomRow({ room, isActive }: { room: ChatRoom; isActive: boolean }) {
  const color = PURPOSE_COLORS[room.purpose] ?? '#7C3AED';
  const Icon = PURPOSE_ICONS[room.purpose] ?? BookOpen;
  return (
    <Link href={`/rooms/${room.id}`}
      className="flex items-center gap-3 px-3 py-3 cursor-pointer transition-all duration-200 relative"
      style={{
        background: isActive ? `${color}15` : 'transparent',
        borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
      }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}20`, color }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate"
          style={{ color: isActive ? color : 'var(--text-primary)' }}>
          {room.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-medium" style={{ color }}>{room.purpose}</span>
          {room.city && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <MapPin className="w-2.5 h-2.5" />
              {room.city}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0" style={{ color: 'var(--text-muted)' }}>
        <Users className="w-3 h-3" />
        <span className="text-[10px]">{room.member_count}</span>
      </div>
    </Link>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { token, user, loading: authLoading } = useAuth();
  const params = useParams<{ matchId?: string }>();
  const router = useRouter();
  const activeMatchId = params?.matchId;

  // Tab state: 'messages' | 'rooms'
  const [activeTab, setActiveTab] = useState<'messages' | 'rooms'>('messages');

  // Messages tab
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);

  // Rooms tab
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomSearch, setRoomSearch] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api<{ conversations: Conversation[] }>('/api/messages/conversations', { token });
      setConversations(data.conversations || []);
    } catch { /* silent */ }
    setLoadingConvs(false);
  }, [token]);

  const fetchRooms = useCallback(async () => {
    if (!token) return;
    setLoadingRooms(true);
    try {
      const qs = new URLSearchParams();
      if (user?.city) qs.set('city', user.city);
      if (user?.country) qs.set('country', user.country);
      const data = await api<{ rooms: ChatRoom[] }>(`/api/chat-rooms?${qs.toString()}`, { token });
      setRooms(data.rooms || []);
    } catch { /* silent */ }
    setLoadingRooms(false);
  }, [token, user?.city, user?.country]);

  useEffect(() => {
    if (user && token) {
      fetchConversations();
      const interval = setInterval(fetchConversations, 15000);
      return () => clearInterval(interval);
    }
  }, [user, token, fetchConversations]);

  // Load rooms when tab is selected
  useEffect(() => {
    if (activeTab === 'rooms' && token && user) {
      fetchRooms();
    }
  }, [activeTab, token, user, fetchRooms]);

  // Refresh conversation list when a new message arrives (from any room)
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socket.on('newMessage', () => {
      setTimeout(fetchConversations, 500);
    });
    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token, fetchConversations]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const filteredConvs = conversations.filter((c) =>
    c.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(roomSearch.toLowerCase()) ||
    r.purpose.toLowerCase().includes(roomSearch.toLowerCase())
  );

  // Mobile: hide sidebar when a chat is open
  const sidebarClass = activeMatchId ? 'hidden md:flex' : 'flex';
  const contentClass = activeMatchId ? 'flex' : 'hidden md:flex';

  return (
    <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Left sidebar ──────────────────────────────────────────────── */}
      <div className={`${sidebarClass} flex-col shrink-0 border-r w-full md:w-80`}
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-default)',
        }}>

        {/* ── Tab switcher ───────────────────────────────────────────── */}
        <div className="shrink-0 flex gap-1 p-2 border-b"
          style={{ borderColor: 'var(--border-default)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200"
            style={
              activeTab === 'messages'
                ? { background: 'var(--color-brand)', color: 'white' }
                : { background: 'transparent', color: 'var(--text-muted)' }
            }
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Messages
            {conversations.some((c) => c.unreadCount > 0) && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: activeTab === 'messages' ? 'white' : 'var(--color-brand)' }} />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rooms')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200"
            style={
              activeTab === 'rooms'
                ? { background: 'linear-gradient(135deg, #7C3AED, #9B5DE5)', color: 'white' }
                : { background: 'transparent', color: 'var(--text-muted)' }
            }
          >
            <Radar className="w-3.5 h-3.5" />
            Rooms
          </button>
        </div>

        {/* ── MESSAGES TAB ────────────────────────────────────────────── */}
        {activeTab === 'messages' && (
          <>
            {/* Search */}
            <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: 'var(--bg-elevated)' }}>
                <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations…"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: 'var(--text-primary)' }}
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')}>
                    <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {loadingConvs ? (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 spinner" />
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <MessageCircle className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {search ? 'No results found' : 'No conversations yet'}
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredConvs.map((conv, i) => (
                    <motion.div key={conv.matchId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}>
                      <ConvRow conv={conv} isActive={conv.matchId === activeMatchId} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </>
        )}

        {/* ── ROOMS TAB ───────────────────────────────────────────────── */}
        {activeTab === 'rooms' && (
          <>
            {/* Search + Create */}
            <div className="px-3 py-2 border-b flex gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1"
                style={{ background: 'var(--bg-elevated)' }}>
                <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  placeholder="Search rooms…"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: 'var(--text-primary)' }}
                />
                {roomSearch && (
                  <button type="button" onClick={() => setRoomSearch('')}>
                    <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowCreateRoom(true)}
                title="Create a room"
                className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #9B5DE5)', color: 'white' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Location hint */}
            {(user?.city || user?.country) && (
              <div className="px-3 pt-2 pb-1">
                <p className="text-[10px] font-medium flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <MapPin className="w-2.5 h-2.5" />
                  Showing rooms near {[user.city, user.country].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            {/* Room list */}
            <div className="flex-1 overflow-y-auto">
              {loadingRooms ? (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 spinner" />
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(124,58,237,0.1)' }}>
                    <Radar className="w-6 h-6" style={{ color: '#7C3AED' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {roomSearch ? 'No rooms found' : 'No rooms in your area'}
                  </p>
                  <p className="text-xs max-w-[200px]" style={{ color: 'var(--text-muted)' }}>
                    {roomSearch ? 'Try a different search term' : 'Be the first to create one!'}
                  </p>
                  {!roomSearch && (
                    <button
                      type="button"
                      onClick={() => setShowCreateRoom(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                      style={{ background: 'linear-gradient(135deg, #7C3AED, #9B5DE5)', color: 'white' }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create a Room
                    </button>
                  )}
                </div>
              ) : (
                <AnimatePresence>
                  {filteredRooms.map((room, i) => (
                    <motion.div key={room.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}>
                      <RoomRow room={room} isActive={false} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Right panel ───────────────────────────────────────────────── */}
      <div className={`${contentClass} flex-1 flex-col overflow-hidden`}
        style={{ background: 'var(--bg-base)' }}>
        {children}
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        open={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        defaultCity={user?.city ?? ''}
        defaultCountry={user?.country ?? ''}
        onCreated={(roomId) => {
          setShowCreateRoom(false);
          setActiveTab('rooms');
          fetchRooms();
          router.push(`/rooms/${roomId}`);
        }}
      />
    </div>
  );
}
