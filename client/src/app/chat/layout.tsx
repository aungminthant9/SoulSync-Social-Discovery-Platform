'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageCircle, X, ArrowLeft } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type Conversation = {
  matchId: string;
  user: { id: string; name: string; avatar_url?: string | null };
  lastMessage: { content: string; created_at: string; sender_id: string } | null;
  unreadCount: number;
  matchedAt?: string;
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

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

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { token, user, loading: authLoading } = useAuth();
  const params = useParams<{ matchId?: string }>();
  const router = useRouter();
  const activeMatchId = params?.matchId;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);

  const socketRef = useRef<Socket | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api<{ conversations: Conversation[] }>('/api/messages/conversations', { token });
      setConversations(data.conversations || []);
    } catch { /* silent */ }
    setLoadingConvs(false);
  }, [token]);

  useEffect(() => {
    if (user && token) {
      fetchConversations();
      const interval = setInterval(fetchConversations, 15000);
      return () => clearInterval(interval);
    }
  }, [user, token, fetchConversations]);

  // Refresh conversation list when a new message arrives (from any room)
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socket.on('newMessage', () => {
      // Debounced refresh of sidebar
      setTimeout(fetchConversations, 500);
    });
    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token, fetchConversations]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const filtered = conversations.filter((c) =>
    c.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Mobile: hide sidebar when a chat is open
  const sidebarClass = activeMatchId ? 'hidden md:flex' : 'flex';
  const contentClass = activeMatchId ? 'flex' : 'hidden md:flex';

  return (
    <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 65px)' }}>

      {/* ── Left sidebar ──────────────────────────────────────────────── */}
      <div className={`${sidebarClass} flex-col shrink-0 border-r w-full md:w-80`}
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-default)',
        }}>


        {/* Sidebar header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-default)' }}>
          <div className="flex items-center gap-2 flex-1">
            <MessageCircle className="w-5 h-5" style={{ color: 'var(--color-brand)' }} />
            <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Messages</h2>
          </div>
        </div>

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
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <MessageCircle className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {search ? 'No results found' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((conv, i) => (
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
      </div>

      {/* ── Right panel ───────────────────────────────────────────────── */}
      <div className={`${contentClass} flex-1 flex-col overflow-hidden`}
        style={{ background: 'var(--bg-base)' }}>
        {children}
      </div>

    </div>
  );
}
