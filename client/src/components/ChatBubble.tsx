'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';

const EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

export type Reaction = {
  emoji: string;
  user_ids: string[];
  count: number;
};

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_deleted?: boolean;
  reactions?: Reaction[];
};

type ChatBubbleProps = {
  message: Message;
  isSelf: boolean;
  currentUserId: string;
  senderName?: string;
  senderAvatarUrl?: string | null;
  selfName?: string;
  selfAvatarUrl?: string | null;
  showName?: boolean;
  showTimestamp?: boolean;
  isLastInGroup?: boolean;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MiniAvatar({
  name,
  avatarUrl,
  show,
}: {
  name?: string;
  avatarUrl?: string | null;
  show: boolean;
}) {
  const hue = name ? name.charCodeAt(0) * 137 : 0;
  const bg = `hsl(${hue % 360}, 60%, 55%)`;
  if (!show) return <div className="w-7 h-7 shrink-0" />;
  if (avatarUrl)
    return <img src={avatarUrl} alt={name} className="w-7 h-7 rounded-full object-cover shrink-0" />;
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ background: bg }}
    >
      {name?.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ChatBubble({
  message,
  isSelf,
  currentUserId,
  senderName,
  senderAvatarUrl,
  selfName,
  selfAvatarUrl,
  showName = false,
  showTimestamp = true,
  isLastInGroup = true,
  onDelete,
  onReact,
}: ChatBubbleProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [hovered, setHovered] = useState(false);

  if (message.is_deleted) return null;

  const reactions = message.reactions ?? [];
  const mb = isLastInGroup ? 'mb-2' : 'mb-0.5';

  const displayName = isSelf ? (selfName || 'You') : (senderName || '?');
  const avatarUrl = isSelf ? selfAvatarUrl : senderAvatarUrl;

  // ── Gift message special rendering ─────────────────────────────────
  const isGift = message.content.startsWith('__GIFT__');
  if (isGift) {
    const sticker = message.content.replace('__GIFT__', '');
    return (
      <motion.div
        initial={{ opacity: 0, y: 5, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 16, stiffness: 240 }}
        className={`flex items-end gap-2 ${mb} ${isSelf ? 'flex-row-reverse' : ''}`}
      >
        <MiniAvatar name={displayName} avatarUrl={avatarUrl} show={isLastInGroup} />
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, var(--color-brand) 0%, var(--color-accent) 100%)',
            boxShadow: '0 4px 20px rgba(232,96,76,0.3)',
          }}
        >
          <span className="text-4xl">{sticker}</span>
          <p className="text-white text-[11px] font-semibold">
            {isSelf ? 'You sent a gift!' : `${displayName} sent a gift!`}
          </p>
          {showTimestamp && (
            <span className="text-white/60 text-[10px]">{formatTime(message.created_at)}</span>
          )}
        </motion.div>
      </motion.div>
    );
  }

  // Self bubble: brand color. Partner: card background.
  const bubbleStyle = isSelf
    ? {
        background: 'var(--color-brand)',
        color: 'white',
        borderBottomLeftRadius: isLastInGroup ? '6px' : '18px',
      }
    : {
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-subtle)',
        borderBottomLeftRadius: isLastInGroup ? '6px' : '18px',
      };

  // Timestamp color inside bubble
  const timeColor = isSelf ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className={`flex items-end gap-2 ${mb}`}
    >
      {/* ── Avatar column ────────────────────────────────────────────── */}
      <MiniAvatar
        name={displayName}
        avatarUrl={avatarUrl}
        show={isLastInGroup}
      />

      {/* ── Message column ───────────────────────────────────────────── */}
      <div className="flex flex-col items-start min-w-0" style={{ maxWidth: '75%' }}>
        {/* Sender name label (first of group) */}
        {showName && (
          <p
            className="text-[11px] font-semibold mb-0.5 ml-1"
            style={{ color: isSelf ? 'var(--color-brand)' : 'var(--color-teal, var(--color-brand))' }}
          >
            {displayName}
          </p>
        )}

        {/* Bubble row + hover toolbar */}
        <div
          className="flex items-end gap-1.5 w-full"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => { setHovered(false); setShowPicker(false); }}
        >
          {/* Bubble */}
          <div
            className="px-3.5 py-2 rounded-2xl text-sm leading-relaxed min-w-0"
            style={bubbleStyle}
          >
            {/* Message text + inline timestamp */}
            <span style={{ wordBreak: 'break-word' }}>{message.content}</span>
            {showTimestamp && (
              <span
                className="ml-2 text-[10px] whitespace-nowrap select-none"
                style={{ color: timeColor, verticalAlign: 'bottom' }}
              >
                {formatTime(message.created_at)}
              </span>
            )}
          </div>

          {/* Hover action toolbar */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.1 }}
                className="flex items-center gap-1 shrink-0"
              >
                {/* Emoji react */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPicker((p) => !p)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                    title="React"
                  >
                    😊
                  </button>

                  <AnimatePresence>
                    {showPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.9 }}
                        transition={{ duration: 0.1 }}
                        className="absolute bottom-9 left-0 flex gap-1 px-2 py-1.5 rounded-2xl shadow-lg z-20"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-default)',
                          boxShadow: 'var(--shadow-md)',
                        }}
                      >
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => { onReact?.(message.id, emoji); setShowPicker(false); }}
                            className="text-lg hover:scale-125 transition-transform"
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Delete (own messages only) */}
                {isSelf && (
                  <button
                    type="button"
                    onClick={() => onDelete?.(message.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      background: 'rgba(224,82,82,0.1)',
                      color: 'var(--color-error)',
                      border: '1px solid rgba(224,82,82,0.2)',
                    }}
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reaction pills */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 ml-0.5">
            {reactions.map((r) => {
              const hasReacted = r.user_ids.includes(currentUserId);
              return (
                <motion.button
                  key={r.emoji}
                  layout
                  type="button"
                  onClick={() => onReact?.(message.id, r.emoji)}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-all"
                  style={{
                    background: hasReacted ? 'var(--color-brand-subtle)' : 'var(--bg-elevated)',
                    border: `1px solid ${hasReacted ? 'var(--color-brand)' : 'var(--border-subtle)'}`,
                    color: hasReacted ? 'var(--color-brand)' : 'var(--text-secondary)',
                  }}
                  title={hasReacted ? 'Remove reaction' : 'Add reaction'}
                >
                  <span>{r.emoji}</span>
                  <span>{r.count}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
