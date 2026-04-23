'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import ChatBubble, { Message, Reaction } from '@/components/ChatBubble';
import GiftPicker from '@/components/GiftPicker';
import { playMessageSound, playCanvasSound } from '@/lib/sounds';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Send, Loader2, Heart, ArrowLeft, ExternalLink, PaintbrushIcon, Gift } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type MatchInfo = {
  matchId: string;
  user: { id: string; name: string; avatar_url?: string | null; city?: string | null; country?: string | null };
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, avatar_url }: { name: string; avatar_url?: string | null }) {
  const hue = name ? name.charCodeAt(0) * 137 : 0;
  const bg = `hsl(${hue % 360}, 60%, 55%)`;
  if (avatar_url) return <img src={avatar_url} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ background: bg }}>
      {name?.charAt(0).toUpperCase()}
    </div>
  );
}

function isSameMinute(a: string, b: string) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate() && da.getHours() === db.getHours() && da.getMinutes() === db.getMinutes();
}

function formatDate(iso: string) {
  const d = new Date(iso), today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatConversationPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<MatchInfo['user'] | null>(null);
  const [text, setText] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [canvasInvite, setCanvasInvite] = useState(false);
  const canvasInviteTimer = useRef<NodeJS.Timeout | null>(null);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [myCredits, setMyCredits] = useState<number | null>(null);
  const [giftToast, setGiftToast] = useState<{ sticker: string; senderName: string; points: number } | null>(null);
  const giftToastTimer = useRef<NodeJS.Timeout | null>(null);
  const [flaggedWarning, setFlaggedWarning] = useState<string | null>(null);
  const flaggedTimer = useRef<NodeJS.Timeout | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auth guard
  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

  // Partner info
  useEffect(() => {
    if (!token || !matchId) return;
    api<{ matches: MatchInfo[] }>('/api/matches', { token })
      .then((d) => { const m = d.matches.find((m) => m.matchId === matchId); if (m) setPartner(m.user); })
      .catch(console.error);
  }, [token, matchId]);

  // Mark as read on open
  useEffect(() => {
    if (!token || !matchId) return;
    api(`/api/messages/${matchId}/read`, { method: 'POST', token }).catch(() => {});
  }, [token, matchId]);

  // Fetch history
  const fetchHistory = useCallback(async (before?: string) => {
    if (!token || !matchId) return;
    before ? setLoadingMore(true) : setLoadingHistory(true);
    try {
      const url = `/api/messages/${matchId}${before ? `?before=${encodeURIComponent(before)}&limit=50` : '?limit=50'}`;
      const data = await api<{ messages: Message[] }>(url, { token });
      const msgs = data.messages || [];
      before ? setMessages((prev) => [...msgs, ...prev]) : setMessages(msgs);
      setHasMore(msgs.length === 50);
    } catch (err) { console.error(err); }
    finally { before ? setLoadingMore(false) : setLoadingHistory(false); }
  }, [token, matchId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, partnerTyping]);

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
        api(`/api/messages/${matchId}/read`, { method: 'POST', token }).catch(() => {});
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
    socket.on('error', ({ message }: { message: string }) => console.error('Socket error:', message));

    // Canvas invite notification — partner opened Soul Canvas
    socket.on('canvasOpened', () => {
      setCanvasInvite(true);
      playCanvasSound();
      if (canvasInviteTimer.current) clearTimeout(canvasInviteTimer.current);
      canvasInviteTimer.current = setTimeout(() => setCanvasInvite(false), 8000);
    });

    // Gift received notification
    socket.on('giftReceived', ({ sticker, senderName, receiverId, newCredits, pointsEarned }: {
      sticker: string; senderName: string; receiverId: string; newCredits: number; pointsEarned: number;
    }) => {
      // Update sender's credits balance
      if (receiverId !== user?.id) setMyCredits(newCredits);
      // Show toast for the receiver
      if (receiverId === user?.id) {
        setGiftToast({ sticker, senderName, points: pointsEarned });
        playMessageSound();
        if (giftToastTimer.current) clearTimeout(giftToastTimer.current);
        giftToastTimer.current = setTimeout(() => setGiftToast(null), 4000);
      }
    });

    // AI Safety Shield — message blocked
    socket.on('messageFlagged', ({ reason }: { reason: string; content: string }) => {
      const msg = reason ? `Your message was blocked: ${reason}` : 'Your message was blocked by AI Safety Shield.';
      setFlaggedWarning(msg);
      if (flaggedTimer.current) clearTimeout(flaggedTimer.current);
      flaggedTimer.current = setTimeout(() => setFlaggedWarning(null), 6000);
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token, matchId, user?.id]);

  // Send
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
    const el = e.target; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    if (!socketRef.current) return;
    socketRef.current.emit('typing', { matchId, isTyping: true });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => socketRef.current?.emit('typing', { matchId, isTyping: false }), 2000);
  };

  const handleDelete = (messageId: string) => socketRef.current?.emit('deleteMessage', { messageId, matchId });
  const handleReact = (messageId: string, emoji: string) => socketRef.current?.emit('react', { messageId, matchId, emoji });

  function shouldShowDate(msgs: Message[], i: number) {
    if (i === 0) return true;
    return new Date(msgs[i - 1].created_at).toDateString() !== new Date(msgs[i].created_at).toDateString();
  }

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand)' }} /></div>;

  // Canvas invite banner (shown over chat when partner opens canvas)
  const CanvasInviteBanner = canvasInvite ? (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b"
      style={{
        background: 'linear-gradient(90deg, var(--color-brand-subtle), rgba(42,181,160,0.08))',
        borderColor: 'var(--color-brand)',
        borderBottomWidth: '1px',
      }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'var(--color-brand)' }}>
        <PaintbrushIcon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
          {partner?.name ?? 'Your match'} opened Soul Canvas!
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Draw together right now</p>
      </div>
      <Link
        href={`/chat/${matchId}/canvas`}
        onClick={() => setCanvasInvite(false)}
        className="btn-primary px-3 py-1.5 text-xs shrink-0"
      >
        Join Canvas
      </Link>
      <button
        type="button"
        onClick={() => setCanvasInvite(false)}
        className="p-1 rounded-lg cursor-pointer transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </motion.div>
  ) : null;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-base)' }}>
      <AnimatePresence>{CanvasInviteBanner}</AnimatePresence>

      {/* ── Chat header ───────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>

        {/* Mobile back button */}
        <Link href="/chat" className="md:hidden p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {partner ? (
          <>
            <div className="relative">
              <Avatar name={partner.name} avatar_url={partner.avatar_url} />
              {connected && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                  style={{ background: 'var(--color-success)', borderColor: 'var(--bg-card)' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-none" style={{ color: 'var(--text-primary)' }}>
                {partner.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {partnerTyping
                  ? <span style={{ color: 'var(--color-brand)' }}>typing…</span>
                  : connected ? 'Online' : 'Connecting…'}
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 h-4 w-32 rounded" style={{ background: 'var(--bg-elevated)' }} />
        )}

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="badge badge-brand text-[10px] hidden sm:flex items-center gap-1">
            <Heart className="w-3 h-3 fill-current" /> Matched
          </span>
          {myCredits !== null && (
            <span className="hidden sm:inline text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
              💳 {myCredits}
            </span>
          )}
          {/* Gift button */}
          {partner && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowGiftPicker((v) => !v)}
                title="Send a gift"
                className="p-1.5 rounded-lg transition-colors cursor-pointer"
                style={{ color: showGiftPicker ? 'var(--color-brand)' : 'var(--text-secondary)' }}
              >
                <Gift className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showGiftPicker && partner && (
                  <GiftPicker
                    matchId={matchId}
                    receiverId={partner.id}
                    receiverName={partner.name}
                    onClose={() => setShowGiftPicker(false)}
                    onSent={(credits) => setMyCredits(credits)}
                  />
                )}
              </AnimatePresence>
            </div>
          )}
          {/* Soul Canvas button */}
          {partner && (
            <Link
              href={`/chat/${matchId}/canvas`}
              title="Open Soul Canvas"
              className="p-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--color-brand)' }}
            >
              <PaintbrushIcon className="w-4 h-4" />
            </Link>
          )}
          {partner && (
            <Link href={`/users/${partner.id}`} title="View profile"
              className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}>
              <ExternalLink className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Gift received toast */}
        <AnimatePresence>
          {giftToast && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              className="absolute top-14 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, var(--color-brand) 0%, var(--color-accent) 100%)',
                boxShadow: '0 8px 24px rgba(232,96,76,0.35)',
              }}
            >
              <span className="text-2xl">{giftToast.sticker}</span>
              <div>
                <p className="text-white text-xs font-semibold leading-none">{giftToast.senderName} sent you a gift!</p>
                <p className="text-white/70 text-[11px] mt-0.5">+{giftToast.points} points earned</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Messages ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center mb-4">
            <button type="button" onClick={() => { const oldest = messages[0]?.created_at; if (oldest) fetchHistory(oldest); }}
              disabled={loadingMore} className="btn-secondary px-4 py-1.5 text-xs flex items-center gap-1.5">
              {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Load earlier messages
            </button>
          </div>
        )}

        {loadingHistory ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--color-brand)' }} />
          </div>
        ) : messages.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--color-brand-subtle)' }}>
              <Heart className="w-7 h-7 fill-current" style={{ color: 'var(--color-brand)' }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>You matched! Say hello 👋</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Be the first to start the conversation</p>
          </motion.div>
        ) : (
          (() => {
            // Only show non-deleted messages so grouping is computed on visible ones
            const visible = messages.filter((m) => !m.is_deleted);
            return visible.map((msg, i) => {
              const nextMsg = visible[i + 1];
              const prevMsg = visible[i - 1];

              const showDate = i === 0
                ? true
                : new Date(prevMsg.created_at).toDateString() !== new Date(msg.created_at).toDateString();

              // Show name for BOTH self and partner at start of group
              const showName = i === 0 ||
                prevMsg?.sender_id !== msg.sender_id ||
                showDate;

              const isLastInGroup = !nextMsg ||
                nextMsg.sender_id !== msg.sender_id ||
                (new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime()) > 5 * 60 * 1000;

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                      <span className="text-[11px] font-medium px-2" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(msg.created_at)}
                      </span>
                      <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                    </div>
                  )}
                  <ChatBubble
                    message={msg}
                    isSelf={msg.sender_id === user?.id}
                    currentUserId={user?.id ?? ''}
                    showName={showName}
                    senderName={partner?.name}
                    senderAvatarUrl={partner?.avatar_url}
                    selfName={user?.name}
                    selfAvatarUrl={(user as any)?.avatar_url ?? null}
                    isLastInGroup={isLastInGroup}
                    showTimestamp={isLastInGroup}
                    onDelete={handleDelete}
                    onReact={handleReact}
                  />
                </div>
              );
            });
          })()
        )}

        {/* Typing dots — matches stacked layout */}
        <AnimatePresence>
          {partnerTyping && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
              className="flex items-end gap-2 mb-2">
              {/* Avatar spacer */}
              <div className="w-7 h-7 rounded-full shrink-0 overflow-hidden"
                style={{ background: 'var(--bg-elevated)' }}>
                {partner?.avatar_url
                  ? <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: `hsl(${(partner?.name?.charCodeAt(0) ?? 0) * 137 % 360},60%,55%)`, color: 'white' }}>
                      {partner?.name?.charAt(0).toUpperCase()}
                    </div>
                }
              </div>
              <div className="flex gap-1 px-3.5 py-2.5 rounded-2xl"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-muted)' }}
                    animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ─────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-t"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <div className="flex items-end gap-2 rounded-2xl px-4 py-2"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
          <textarea ref={textareaRef} rows={1} value={text}
            onChange={handleTextChange} onKeyDown={handleKeyDown}
            placeholder="Write a message… (Enter to send)"
            className="flex-1 bg-transparent resize-none outline-none text-sm py-1.5"
            style={{ color: 'var(--text-primary)', maxHeight: '120px', lineHeight: '1.5' }}
          />
          <button type="button" onClick={handleSend} disabled={!text.trim() || !connected}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 mb-0.5"
            style={{
              background: text.trim() && connected ? 'var(--color-brand)' : 'transparent',
              color: text.trim() && connected ? 'white' : 'var(--text-muted)',
            }}>
            <Send className="w-4 h-4" />
          </button>
        </div>
        {!connected && (
          <p className="text-center text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Connecting…</p>
        )}
        {/* AI Safety Shield warning toast */}
        <AnimatePresence>
          {flaggedWarning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="flex items-start gap-2 mt-2 px-3 py-2 rounded-xl text-xs cursor-pointer"
                style={{ background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.25)', color: 'var(--color-error)' }}
                onClick={() => setFlaggedWarning(null)}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="flex-1">🛡️ <strong>AI Safety Shield:</strong> {flaggedWarning} <span className="opacity-60">(tap to dismiss)</span></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
