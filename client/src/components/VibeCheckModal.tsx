'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Copy, Check, MessageCircle, Zap, MapPin, Heart, Battery } from 'lucide-react';
import { api } from '@/lib/api';

type VibeResult = {
  id: string;
  score: number;
  vibe_type: string;
  dimensions: { interests: number; personality: number; location: number; energy: number };
  insights: string[];
  conversation_starter: string;
  credits_charged: number;
  created_at: string;
};

type Props = {
  targetId: string;
  targetName: string;
  targetAvatar?: string;
  myName: string;
  myAvatar?: string;
  token: string;
  matchId?: string | null;
  onClose: () => void;
};

const VIBE_COLORS: Record<string, { from: string; to: string; label: string }> = {
  'Cosmic Connection': { from: '#a855f7', to: '#ec4899', label: '🌌' },
  'Soulmate Energy':   { from: '#E8604C', to: '#D4A853', label: '💞' },
  'Adventure Duo':     { from: '#22c55e', to: '#14b8a6', label: '🏔️' },
  'Creative Sparks':   { from: '#f97316', to: '#eab308', label: '✨' },
  'Slow Burn':         { from: '#e8604c', to: '#f97316', label: '🔥' },
  'Wild Cards':        { from: '#8b5cf6', to: '#3b82f6', label: '🃏' },
  'Friendly Vibe':     { from: '#2ab5a0', to: '#22c55e', label: '☀️' },
  'Quiet Depth':       { from: '#3b82f6', to: '#8b5cf6', label: '🌊' },
};

const DIMENSION_CFG = [
  { key: 'interests', label: 'Hobbies Match', icon: Heart },
  { key: 'personality', label: 'Personality', icon: Zap },
  { key: 'location', label: 'Location Closeness', icon: MapPin },
  { key: 'energy', label: 'Energy Level', icon: Battery },
] as const;

function ScoreRing({ score, from, to }: { score: number; from: string; to: string }) {
  const [displayed, setDisplayed] = useState(0);
  const R = 58;
  const circ = 2 * Math.PI * R;

  useEffect(() => {
    let start: number | null = null;
    const duration = 1500;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplayed(Math.round(ease * score));
      if (p < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [score]);

  const filled = circ * (1 - displayed / 100);

  return (
    <div style={{ position: 'relative', width: 148, height: 148, margin: '0 auto' }}>
      <svg width="148" height="148" style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx="74" cy="74" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle cx="74" cy="74" r={R} fill="none" stroke="url(#ring-grad)"
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={filled}
          style={{ transition: 'stroke-dashoffset 0.05s linear' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: '"Fira Code", monospace', fontSize: 34, fontWeight: 800, background: `linear-gradient(135deg, ${from}, ${to})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
          {displayed}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 1 }}>/ 100</span>
      </div>
    </div>
  );
}

function DimensionBar({ label, value, icon: Icon, delay }: { label: string; value: number; icon: React.ElementType; delay: number }) {
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#D4A853' : '#E8604C';
  return (
    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.5)' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{label}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color, fontFamily: '"Fira Code", monospace' }}>{value}</span>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay: delay + 0.1, duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 6, background: color }}
        />
      </div>
    </motion.div>
  );
}

function Avatar({ name, url, size = 44 }: { name: string; url?: string; size?: number }) {
  const hue = name.charCodeAt(0) * 137 % 360;
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: size / 4, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)' }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: size / 4, background: `linear-gradient(145deg, hsl(${hue},65%,52%), hsl(${(hue+55)%360},70%,42%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 900, color: 'white', border: '2px solid rgba(255,255,255,0.15)' }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function VibeCheckModal({ targetId, targetName, targetAvatar, myName, myAvatar, token, matchId, onClose }: Props) {
  const [phase, setPhase] = useState<'loading' | 'result' | 'error'>('loading');
  const [result, setResult] = useState<VibeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [creditsUsed, setCreditsUsed] = useState(0);

  useEffect(() => {
    const run = async () => {
      try {
        // First check cache (GET)
        const cached = await api<{ result: VibeResult | null; cached: boolean }>(`/api/vibe-check/${targetId}`, { token });
        if (cached.result) {
          setResult(cached.result);
          setCreditsUsed(0);
          setPhase('result');
          return;
        }
        // Run AI (POST)
        const fresh = await api<{ result: VibeResult; cached: boolean; credits_used: number }>(`/api/vibe-check/${targetId}`, { method: 'POST', token });
        setResult(fresh.result);
        setCreditsUsed(fresh.credits_used);
        setPhase('result');
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Vibe check failed.');
        setPhase('error');
      }
    };
    run();
  }, [targetId, token]);

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.conversation_starter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cfg = result ? (VIBE_COLORS[result.vibe_type] ?? VIBE_COLORS['Friendly Vibe']) : VIBE_COLORS['Friendly Vibe'];

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        onClick={onClose}
      >
        <motion.div key="modal"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{ position: 'relative', width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', borderRadius: 24, background: 'linear-gradient(160deg, #1a1025 0%, #0f1720 100%)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Close */}
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
            <X style={{ width: 16, height: 16 }} />
          </button>

          {/* Loading phase */}
          {phase === 'loading' && (
            <div style={{ padding: '60px 30px', textAlign: 'center' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(232,96,76,0.2)', borderTopColor: '#E8604C', margin: '0 auto 20px' }} />
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Analyzing your vibe…</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>AI is reading both profiles ✨</p>
            </div>
          )}

          {/* Error phase */}
          {phase === 'error' && (
            <div style={{ padding: '60px 30px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>😕</div>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Vibe Check Failed</p>
              <p style={{ color: 'rgba(255,100,80,0.9)', fontSize: 13, margin: '0 0 20px' }}>{errorMsg}</p>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', borderRadius: 12, padding: '10px 28px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Close</button>
            </div>
          )}

          {/* Result phase */}
          {phase === 'result' && result && (
            <div style={{ padding: '28px 28px 32px' }}>
              {/* Header avatars */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
                <Avatar name={myName} url={myAvatar} size={44} />
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
                  style={{ fontSize: 22 }}>✨</motion.div>
                <Avatar name={targetName} url={targetAvatar} size={44} />
              </div>
              <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 24px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Vibe Check · {myName} &amp; {targetName}
              </p>

              {/* Score ring */}
              <ScoreRing score={result.score} from={cfg.from} to={cfg.to} />

              {/* Vibe type */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                style={{ textAlign: 'center', margin: '16px 0 24px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 20px', borderRadius: 30, fontWeight: 800, fontSize: 15, background: `linear-gradient(135deg, ${cfg.from}22, ${cfg.to}22)`, border: `1px solid ${cfg.from}44`, color: 'white' }}>
                  <span style={{ fontSize: 18 }}>{cfg.label}</span> {result.vibe_type}
                </span>
                {creditsUsed > 0 && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>−{creditsUsed} credits</p>}
              </motion.div>

              {/* Dimension bars */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '16px 18px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {DIMENSION_CFG.map((dim, i) => (
                  <DimensionBar key={dim.key} label={dim.label} value={result.dimensions[dim.key] ?? 0} icon={dim.icon} delay={0.5 + i * 0.1} />
                ))}
              </div>

              {/* Insights */}
              {result.insights.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>What the AI sees 🔍</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.insights.map((ins, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 + i * 0.12 }}
                        style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <span style={{ fontSize: 14, marginTop: 1 }}>{'💡✨🔗'.charAt(i)}</span>
                        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{ins}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Conversation starter */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
                style={{ background: `linear-gradient(135deg, ${cfg.from}18, ${cfg.to}10)`, border: `1px solid ${cfg.from}30`, borderRadius: 16, padding: '14px 16px', marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: cfg.from, marginBottom: 8 }}>💬 Suggested Opener</p>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: '0 0 12px', fontStyle: 'italic' }}>
                  "{result.conversation_starter}"
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    {copied ? <Check style={{ width: 13, height: 13, color: '#22c55e' }} /> : <Copy style={{ width: 13, height: 13 }} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  {matchId && (
                    <a href={`/chat/${matchId}`} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 10, background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})`, border: 'none', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                      <MessageCircle style={{ width: 13, height: 13 }} /> Send as Message
                    </a>
                  )}
                </div>
              </motion.div>

              {/* Footer */}
              <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                AI analysis · valid {result.created_at ? '7 days from ' + new Date(result.created_at).toLocaleDateString() : 'for 7 days'}
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
