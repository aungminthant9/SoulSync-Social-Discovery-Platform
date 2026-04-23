'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Star, Coins, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Sticker {
  id: string;
  name: string;
  icon: string;
  price_credits: number;
  point_value: number;
}

interface GiftPickerProps {
  matchId: string;
  receiverId: string;
  receiverName: string;
  onClose: () => void;
  onSent?: (newCredits: number, pointsEarned: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GiftPicker({ matchId, receiverId, receiverName, onClose, onSent }: GiftPickerProps) {
  const { token } = useAuth();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [loadingStickers, setLoadingStickers] = useState(true);
  const [sending, setSending] = useState<string | null>(null); // stickerId being sent
  const [sentSticker, setSentSticker] = useState<Sticker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch stickers catalogue + balance in parallel
  useEffect(() => {
    if (!token) return;
    setLoadingStickers(true);
    Promise.all([
      api<{ stickers: Sticker[] }>('/api/economy/stickers', { token }),
      api<{ credits: number; points: number }>('/api/economy/balance', { token }),
    ])
      .then(([stickerData, balanceData]) => {
        setStickers(stickerData.stickers);
        setCredits(balanceData.credits);
      })
      .catch(() => {
        setStickers([]);
        setCredits(0);
      })
      .finally(() => setLoadingStickers(false));
  }, [token]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSend = async (sticker: Sticker) => {
    if (!token || sending) return;
    if (credits !== null && credits < sticker.price_credits) {
      setError(`Need ${sticker.price_credits} credits. You have ${credits}.`);
      return;
    }
    setError(null);
    setSending(sticker.id);
    try {
      const result = await api<{ newCredits: number; pointsEarned: number }>(
        '/api/economy/gift',
        {
          method: 'POST',
          token,
          body: { matchId, receiverId, stickerId: sticker.id },
        }
      );
      setSentSticker(sticker);
      setCredits(result.newCredits);
      onSent?.(result.newCredits, result.pointsEarned);
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to send gift. Try again.');
    } finally {
      setSending(null);
    }
  };

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 12 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      className="absolute top-full mt-2 right-0 z-50 w-72 rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: 'linear-gradient(135deg, var(--color-brand) 0%, var(--color-accent) 100%)',
        }}
      >
        <div>
          <p className="text-white font-semibold text-sm leading-none">Send a Gift</p>
          <p className="text-white/70 text-xs mt-0.5">to {receiverName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      {/* ── Balance bar ── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
      >
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {credits === null ? '…' : credits} credits
          </span>
        </div>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Tap a gift to send
        </span>
      </div>

      {/* ── Success state ── */}
      <AnimatePresence mode="wait">
        {sentSticker ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-8 gap-2"
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
              className="text-5xl"
            >
              {sentSticker.icon}
            </motion.div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {sentSticker.name} sent! 🎉
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {receiverName} earned +{sentSticker.point_value} pts
            </p>
          </motion.div>
        ) : (
          <motion.div key="grid" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Error */}
            {error && (
              <div
                className="mx-3 mt-3 px-3 py-2 rounded-xl text-xs"
                style={{ background: 'rgba(224,82,82,0.1)', color: 'var(--color-error)' }}
              >
                {error}
              </div>
            )}

            {/* Loading */}
            {loadingStickers ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand)' }} />
              </div>
            ) : (
              <>
                {/* Sticker grid */}
                <div className="grid grid-cols-4 gap-2 p-3">
                  {stickers.map((sticker) => {
                    const isLoading = sending === sticker.id;
                    const canAfford = credits === null || credits >= sticker.price_credits;
                    const disabled = !!sending || !canAfford;
                    return (
                      <motion.button
                        key={sticker.id}
                        type="button"
                        onClick={() => handleSend(sticker)}
                        disabled={disabled}
                        whileHover={disabled ? {} : { scale: 1.12, y: -2 }}
                        whileTap={disabled ? {} : { scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        title={`${sticker.name} — ${sticker.price_credits} credits`}
                        className="flex flex-col items-center justify-center gap-0.5 aspect-square rounded-xl cursor-pointer transition-all duration-150"
                        style={{
                          background: isLoading
                            ? 'var(--color-brand-subtle)'
                            : 'var(--bg-elevated)',
                          border: `1px solid ${isLoading ? 'var(--color-brand)' : 'var(--border-subtle)'}`,
                          opacity: disabled && !isLoading ? 0.4 : 1,
                        }}
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand)' }} />
                        ) : (
                          <>
                            <span className="text-2xl leading-none">{sticker.icon}</span>
                            <span
                              className="text-[9px] font-semibold leading-none"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {sticker.price_credits}💳
                            </span>
                          </>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Low credits hint */}
                {credits !== null && credits < Math.min(...stickers.map((s) => s.price_credits), 999) && (
                  <p className="px-4 pb-3 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Keep connecting with people to earn more credits ✨
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
