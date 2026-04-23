'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Play, CheckCircle2, Lock, Tv2, RefreshCw } from 'lucide-react';

const MOCK_ADS = [
  {
    id: 'ad1',
    brand: 'TravelMate',
    tagline: 'Explore the world with the one you love ✈️',
    category: 'Travel',
    duration: 15,
    color: '#2AB5A0',
    bg: 'rgba(42,181,160,0.08)',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-couple-watching-the-sunset-4557-large.mp4',
    thumbnail: '✈️',
  },
  {
    id: 'ad2',
    brand: 'BrewCraft Coffee',
    tagline: 'Every great morning starts with great coffee ☕',
    category: 'Lifestyle',
    duration: 15,
    color: '#D4A853',
    bg: 'rgba(212,168,83,0.08)',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-coffee-in-a-cup-seen-up-close-11786-large.mp4',
    thumbnail: '☕',
  },
  {
    id: 'ad3',
    brand: 'BloomBox',
    tagline: 'Send flowers. Send love. Surprise someone today 🌸',
    category: 'Gifts',
    duration: 15,
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.08)',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-flowers-in-a-field-4751-large.mp4',
    thumbnail: '🌸',
  },
];

type AdStatus = {
  watched_today: number;
  remaining: number;
  max_per_day: number;
  credits_per_ad: number;
  can_watch: boolean;
};

function AdCard({
  ad,
  index,
  adStatus,
  onClaimed,
}: {
  ad: typeof MOCK_ADS[0];
  index: number;
  adStatus: AdStatus | null;
  onClaimed: (credits: number) => void;
}) {
  const { token, refreshUser } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done' | 'claimed'>('idle');
  const [timeLeft, setTimeLeft] = useState(ad.duration);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const alreadyWatched = adStatus ? index < adStatus.watched_today : false;
  const locked = adStatus ? index >= adStatus.watched_today + 1 : index > 0;
  const isNext = adStatus ? index === adStatus.watched_today : index === 0;

  const startAd = () => {
    if (!isNext || phase !== 'idle') return;
    setPhase('playing');
    setTimeLeft(ad.duration);
    videoRef.current?.play().catch(() => {});

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setPhase('done');
          videoRef.current?.pause();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const claimCredits = async () => {
    if (!token) return;
    setClaiming(true);
    setError('');
    try {
      const data = await api<{ credits_earned: number }>('/api/ads/watch', { method: 'POST', token });
      setPhase('claimed');
      onClaimed(data.credits_earned);
      await refreshUser();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to claim credits.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        background: 'var(--bg-card)',
        border: `1.5px solid ${alreadyWatched || phase === 'claimed' ? `${ad.color}40` : locked ? 'var(--border-subtle)' : 'var(--border-default)'}`,
        opacity: locked ? 0.55 : 1,
        boxShadow: isNext && phase === 'idle' ? `0 4px 24px ${ad.color}20` : 'none',
      }}
    >
      {/* Video */}
      <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          src={ad.videoUrl}
          muted
          playsInline
          loop={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        {/* Overlay states */}
        {phase === 'idle' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.52)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            {locked ? (
              <>
                <Lock style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.4)' }} />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>Watch previous ad first</p>
              </>
            ) : alreadyWatched ? (
              <>
                <CheckCircle2 style={{ width: 32, height: 32, color: '#22c55e' }} />
                <p style={{ color: '#22c55e', fontSize: 13, fontWeight: 700, margin: 0 }}>Watched & Claimed!</p>
              </>
            ) : (
              <button onClick={startAd}
                style={{ width: 56, height: 56, borderRadius: '50%', background: ad.color, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 8px ${ad.color}30` }}>
                <Play style={{ width: 22, height: 22, color: 'white', marginLeft: 3 }} />
              </button>
            )}
          </div>
        )}

        {phase === 'playing' && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
            <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{timeLeft}s</span>
          </div>
        )}

        {(phase === 'done') && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <CheckCircle2 style={{ width: 32, height: 32, color: '#22c55e' }} />
            <p style={{ color: 'white', fontSize: 14, fontWeight: 700, margin: 0 }}>Ad complete!</p>
          </div>
        )}

        {phase === 'claimed' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <CheckCircle2 style={{ width: 32, height: 32, color: '#22c55e' }} />
            <p style={{ color: '#22c55e', fontSize: 14, fontWeight: 700, margin: 0 }}>+5 Credits Earned!</p>
          </div>
        )}

        {/* Brand watermark */}
        <div style={{ position: 'absolute', bottom: 10, left: 12, background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '3px 8px' }}>
          <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>AD · {ad.brand}</span>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: ad.bg, color: ad.color }}>{ad.category}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ad.duration}s</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{ad.tagline}</p>
          </div>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
            <Coins style={{ width: 13, height: 13 }} />
            <span style={{ fontSize: 12, fontWeight: 800 }}>+5</span>
          </div>
        </div>

        {/* Claim button */}
        {phase === 'done' && (
          <motion.button
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            onClick={claimCredits}
            disabled={claiming}
            style={{ width: '100%', marginTop: 12, padding: '10px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${ad.color}, ${ad.color}cc)`, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {claiming ? <><RefreshCw style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />Claiming…</> : <><Coins style={{ width: 14, height: 14 }} />Claim 5 Credits</>}
          </motion.button>
        )}
        {error && <p style={{ color: '#EF4444', fontSize: 12, marginTop: 8, margin: '8px 0 0' }}>{error}</p>}
      </div>
    </motion.div>
  );
}

export default function EarnCreditsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [adStatus, setAdStatus] = useState<AdStatus | null>(null);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!token) return;
    api<AdStatus>('/api/ads/status', { token })
      .then(setAdStatus)
      .catch(() => {});
  }, [token]);

  const handleClaimed = (credits: number) => {
    setTotalEarned(prev => prev + credits);
    setAdStatus(prev => prev ? {
      ...prev,
      watched_today: prev.watched_today + 1,
      remaining: Math.max(0, prev.remaining - 1),
      can_watch: prev.remaining - 1 > 0,
    } : prev);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 spinner" /></div>;
  if (!user) return null;

  const allDone = adStatus ? adStatus.remaining === 0 : false;

  return (
    <div className="mesh-bg min-h-screen pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-5 relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 20, padding: '20px 24px' }}>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, rgba(212,168,83,0.2), rgba(232,96,76,0.15))', border: '1px solid rgba(212,168,83,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                📺
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Earn Credits</h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Watch short ads · get 5 credits each</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Your Balance', value: `${user.credits ?? 0}`, icon: '💰', color: '#D4A853' },
                { label: 'Watched Today', value: `${adStatus?.watched_today ?? 0} / ${adStatus?.max_per_day ?? 3}`, icon: '📺', color: '#E8604C' },
                { label: 'Earned Today', value: `+${totalEarned + (adStatus?.watched_today ?? 0) * 0}`, icon: '⭐', color: '#22c55e' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-elevated)', borderRadius: 14, padding: '12px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Daily limit reached */}
        {allDone && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle2 style={{ width: 20, height: 20, color: '#22c55e', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#22c55e', fontSize: 14 }}>All done for today! 🎉</p>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                You've watched all {adStatus?.max_per_day} ads. Come back tomorrow for more credits!
              </p>
            </div>
          </motion.div>
        )}

        {/* How it works */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 16, padding: '14px 18px' }}>
          <div className="flex items-center gap-2 mb-3">
            <Tv2 style={{ width: 15, height: 15, color: 'var(--color-brand)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>How it works</span>
          </div>
          <div className="flex flex-col gap-2">
            {['▶️  Click Play on an ad below', '⏱️  Watch the full 15-second video', '💰  Click "Claim 5 Credits" to earn', '🔁  Up to 3 ads per day (15 credits)'].map((step, i) => (
              <p key={i} style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{step}</p>
            ))}
          </div>
        </motion.div>

        {/* Ad Cards */}
        <div className="space-y-4">
          {MOCK_ADS.map((ad, i) => (
            <AdCard
              key={ad.id}
              ad={ad}
              index={i}
              adStatus={adStatus}
              onClaimed={handleClaimed}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
