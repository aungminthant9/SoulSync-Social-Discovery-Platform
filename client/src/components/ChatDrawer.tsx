'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import ChatBubble, { Message, Reaction } from '@/components/ChatBubble';
import { playMessageSound } from '@/lib/sounds';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { X, Send, Loader2, Minus, ArrowUpRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type Partner = {
  id: string;
  name: string;
  avatar_url?: string | null;
};

type Props = {
  matchId: string;
  partner: Partner;
  onClose: () => void;
  onUnread?: (matchId: string, count: number) => void;
};

function Avatar({ name, avatar_url }: { name: string; avatar_url?: string | null }) {
  const hue = name ? name.charCodeAt(0) * 137 : 0;
  const bg = `hsl(${hue % 360}, 60%, 55%)`;
  if (avatar_url) return <img src={avatar_url} alt={name} className="w-8 h-8 rounded-full object-cover" />;
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ background: bg }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function shouldShowDate(msgs: Message[], i: number) {
  if (i === 0) return true;
  return new Date(msgs[i - 1].created_at).toDateString() !== new Date(msgs[i].created_at).toDateString();
}

export default function ChatDrawer({ matchId, partner, onClose, onUnread }: Props) {
  const { user, token } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Mark messages as read
  const markRead = useCallback(() => {
    if (!token) return;
    api(`/api/messages/${matchId}/read`, { method: 'POST', token }).catch(() => {});
    onUnread?.(matchId, 0);
  }, [token, matchId, onUnread]);

  // Fetch history
  useEffect(() => {
    if (!token || !matchId) return;
    setLoading(true);
    api<{ messages: Message[] }>(`/api/messages/${matchId}?limit=50`, { token })
      .then((d) => { setMessages(d.messages || []); markRead(); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, matchId, markRead]);

  // Auto-scroll
  useEffect(() => {
    if (!minimised) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping, minimised]);

  // Socket
  useEffect(() => {
    if (!token || !matchId) return;
    const socket = io(API_URL, { auth: { token }, transports: ['websocket'] });

    socket.on('connect', () => { setConnected(true); socket.emit('joinRoom', { matchId }); });
    socket.on('disconnect', () => setConnected(false));

    socket.on('newMessage', (msg: Message) => {
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      if (msg.sender_id !== user?.id) {
        playMessageSound();
        markRead();
      }
    });

    socket.on('messageDeleted', ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.map((m) =>
        m.id === messageId ? { ...m, is_deleted: true, content: 'This message was deleted.' } : m
      ));
    });

    socket.on('reactionUpdated', ({ messageId, reactions }: { messageId: string; reactions: Reaction[] }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    });

    socket.on('partnerTyping', ({ isTyping }: { isTyping: boolean }) => setPartnerTyping(isTyping));

    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token, matchId, user?.id, markRead]);

  const handleSend = () => {
    const content = text.trim();
    if (!content || !socketRef.current || !connected) return;
    socketRef.current.emit('sendMessage', { matchId, content });
    setText('');
    socketRef.current.emit('typing', { matchId, isTyping: false });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
    if (!socketRef.current) return;
    socketRef.current.emit('typing', { matchId, isTyping: true });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => socketRef.current?.emit('typing', { matchId, isTyping: false }), 2000);
  };

  const handleDelete = (messageId: string) => socketRef.current?.emit('deleteMessage', { messageId, matchId });
  const handleReact = (messageId: string, emoji: string) => socketRef.current?.emit('react', { messageId, matchId, emoji });

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.96 }}
      transition={{ type: 'spring', damping: 24, stiffness: 280 }}
      className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
      style={{
        width: '360px',
        height: minimised ? 'auto' : '520px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 shrink-0 cursor-pointer select-none"
        style={{ background: 'var(--color-brand)', color: 'white' }}
        onClick={() => setMinimised((m) => !m)}
      >
        <Avatar name={partner.name} avatar_url={partner.avatar_url} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-none truncate">{partner.name}</p>
          <p className="text-[11px] mt-0.5 opacity-80">
            {partnerTyping ? 'typing…' : connected ? 'Online' : 'Connecting…'}
          </p>
        </div>
        {/* Open full page */}
        <Link
          href={`/chat/${matchId}`}
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded opacity-70 hover:opacity-100 transition-opacity"
          title="Open full chat"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
        <button
          onClick={(e) => { e.stopPropagation(); setMinimised((m) => !m); }}
          className="p-1 rounded opacity-70 hover:opacity-100 transition-opacity"
          title={minimised ? 'Expand' : 'Minimise'}
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-1 rounded opacity-70 hover:opacity-100 transition-opacity"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Body (hidden when minimised) ─────────────────────────────────── */}
      <AnimatePresence>
        {!minimised && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col flex-1 overflow-hidden"
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3" style={{ background: 'var(--bg-base)' }}>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand)' }} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-2xl mb-2">👋</p>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Say hello to {partner.name}!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const showDate = shouldShowDate(messages, i);
                  const prevMsg = messages[i - 1];
                  const showName = msg.sender_id !== user?.id && (i === 0 || prevMsg?.sender_id !== msg.sender_id);
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex items-center gap-2 my-2">
                          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                        </div>
                      )}
                      <ChatBubble
                        message={msg}
                        isSelf={msg.sender_id === user?.id}
                        currentUserId={user?.id ?? ''}
                        showName={showName}
                        senderName={partner.name}
                        onDelete={handleDelete}
                        onReact={handleReact}
                      />
                    </div>
                  );
                })
              )}

              {/* Typing dots */}
              <AnimatePresence>
                {partnerTyping && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex gap-1 px-3 py-2 rounded-2xl w-fit mb-1"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-muted)' }}
                        animate={{ y: [0, -3, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-3 py-2.5 border-t" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
              <div className="flex items-end gap-2 rounded-xl px-3 py-2"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message…"
                  className="flex-1 bg-transparent resize-none outline-none text-sm py-0.5"
                  style={{ color: 'var(--text-primary)', maxHeight: '100px', lineHeight: '1.5' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || !connected}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0"
                  style={{
                    background: text.trim() && connected ? 'var(--color-brand)' : 'transparent',
                    color: text.trim() && connected ? 'white' : 'var(--text-muted)',
                  }}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
