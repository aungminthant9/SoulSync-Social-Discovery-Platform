'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paintbrush, X, Check, Clock } from 'lucide-react';

const TIMEOUT_SECS = 60;

export interface CanvasInvitePayload {
  matchId: string;
  inviterId: string;
  inviterName: string;
  expiresAt: number;
}

interface Props {
  invite: CanvasInvitePayload | null;
  onAccept: (invite: CanvasInvitePayload) => void;
  onDecline: (invite: CanvasInvitePayload) => void;
}

export default function CanvasInviteToast({ invite, onAccept, onDecline }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!invite) return;

    const calcLeft = () => Math.max(0, Math.ceil((invite.expiresAt - Date.now()) / 1000));

    intervalRef.current = setInterval(() => {
      const left = calcLeft();
      setSecondsLeft(left);
      if (left <= 0 && intervalRef.current) clearInterval(intervalRef.current);
    }, 500);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [invite]);

  const visibleSecondsLeft = invite ? secondsLeft : TIMEOUT_SECS;
  const progress = Math.max(0, Math.min(1, visibleSecondsLeft / TIMEOUT_SECS));
  const circumference = 2 * Math.PI * 14;

  return (
    <AnimatePresence>
      {invite && (
        <motion.div
          key={invite.inviterId + invite.matchId}
          initial={{ opacity: 0, y: 80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100vw-2rem)] max-w-sm"
        >
          <div
            className="rounded-2xl p-4 shadow-2xl flex items-start gap-4"
            style={{
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border-default)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
            }}
          >
            {/* Countdown ring */}
            <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" width="48" height="48" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none"
                  stroke="var(--bg-elevated)" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none"
                  stroke="var(--color-brand)" strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                  style={{ transition: 'stroke-dashoffset 0.5s linear' }}
                />
              </svg>
              <div
                className="relative w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(232,96,76,0.12)' }}
              >
                <Paintbrush className="w-4 h-4" style={{ color: 'var(--color-brand)' }} />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <p className="text-sm font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {invite.inviterName} wants to draw!
                </p>
                <span
                  className="text-xs font-mono font-semibold shrink-0 mt-0.5"
                  style={{ color: visibleSecondsLeft <= 10 ? 'var(--color-error)' : 'var(--text-muted)' }}
                >
                  <Clock className="w-3 h-3 inline mr-0.5 -mt-px" />
                  {visibleSecondsLeft}s
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Soul Canvas invitation — draw together in real time
              </p>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => onAccept(invite)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all hover:opacity-90"
                  style={{ background: 'var(--color-brand)', color: 'white' }}
                >
                  <Check className="w-3.5 h-3.5" />
                  Join
                </button>
                <button
                  onClick={() => onDecline(invite)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                  style={{
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                  Decline
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
