'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Trophy, Star, Crown, Medal, ArrowLeft, Loader2 } from 'lucide-react';

type LeaderboardUser = {
  id: string;
  name: string;
  avatar_url?: string | null;
  city?: string;
  country?: string;
  points: number;
};

// Rank badge styles for top 3
const RANK_CONFIG: Record<number, { icon: React.ReactNode; bg: string; text: string; glow: string }> = {
  1: {
    icon: <Crown className="w-5 h-5" />,
    bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    text: '#fff',
    glow: '0 0 20px rgba(245,158,11,0.4)',
  },
  2: {
    icon: <Trophy className="w-4 h-4" />,
    bg: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)',
    text: '#fff',
    glow: '0 0 12px rgba(148,163,184,0.3)',
  },
  3: {
    icon: <Medal className="w-4 h-4" />,
    bg: 'linear-gradient(135deg, #CD7C3A 0%, #A0522D 100%)',
    text: '#fff',
    glow: '0 0 12px rgba(205,124,58,0.3)',
  },
};

function Avatar({ name, avatar_url, size = 10 }: { name: string; avatar_url?: string | null; size?: number }) {
  const hue = name ? name.charCodeAt(0) * 137 : 0;
  const bg = `hsl(${hue % 360}, 60%, 52%)`;
  const cls = `w-${size} h-${size} rounded-full object-cover shrink-0 font-bold text-white flex items-center justify-center`;
  if (avatar_url) return <img src={avatar_url} alt={name} className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />;
  return (
    <div className={cls} style={{ background: bg, width: `${size * 4}px`, height: `${size * 4}px`, fontSize: size > 8 ? '1.5rem' : '0.875rem' }}>
      {name?.charAt(0).toUpperCase()}
    </div>
  );
}

export default function LeaderboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!token) return;
    api<{ leaderboard: LeaderboardUser[] }>('/api/economy/leaderboard', { token })
      .then((d) => {
        setLeaders(d.leaderboard || []);
        const rank = d.leaderboard.findIndex((u) => u.id === user?.id);
        if (rank !== -1) setMyRank(rank + 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, user?.id]);

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-brand)' }} />
    </div>
  );

  // Podium order: 2nd, 1st, 3rd (classic trophy podium)
  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div className="mesh-bg min-h-screen pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-8 relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm mb-6 cursor-pointer transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: 'linear-gradient(135deg, var(--color-brand) 0%, var(--color-accent) 100%)', boxShadow: '0 8px 32px rgba(232,96,76,0.35)' }}>
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Leaderboard</h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>Top users by popularity points</p>
            {myRank && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full text-sm font-semibold"
                style={{ background: 'var(--color-brand-subtle)', color: 'var(--color-brand)' }}
              >
                <Star className="w-3.5 h-3.5" />
                You are ranked #{myRank}
              </motion.div>
            )}
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-brand)' }} />
          </div>
        ) : (
          <>
            {/* ── Podium (top 3) ── */}
            {top3.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-end justify-center gap-2 sm:gap-4 mb-8 overflow-hidden"
              >
                {/* 2nd place */}
                {top3[1] && (
                  <PodiumCard user={top3[1]} rank={2} delay={0.2} isMe={top3[1].id === user?.id} />
                )}
                {/* 1st place — tallest */}
                {top3[0] && (
                  <PodiumCard user={top3[0]} rank={1} delay={0.1} isMe={top3[0].id === user?.id} />
                )}
                {/* 3rd place */}
                {top3[2] && (
                  <PodiumCard user={top3[2]} rank={3} delay={0.3} isMe={top3[2].id === user?.id} />
                )}
              </motion.div>
            )}

            {/* ── Ranks 4-10 ── */}
            {rest.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
              >
                {rest.map((u, i) => {
                  const rank = i + 4;
                  const isMe = u.id === user?.id;
                  return (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                    >
                      <Link
                        href={`/users/${u.id}`}
                        className="flex items-center gap-4 px-5 py-4 transition-colors cursor-pointer"
                        style={{
                          borderBottom: i < rest.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                          background: isMe ? 'var(--color-brand-subtle)' : 'transparent',
                        }}
                      >
                        {/* Rank number */}
                        <span className="w-6 text-sm font-bold text-center shrink-0" style={{ color: 'var(--text-muted)' }}>
                          {rank}
                        </span>

                        <Avatar name={u.name} avatar_url={u.avatar_url} size={10} />

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: isMe ? 'var(--color-brand)' : 'var(--text-primary)' }}>
                            {u.name} {isMe && <span className="text-[11px] font-normal opacity-70">(You)</span>}
                          </p>
                          {(u.city || u.country) && (
                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {[u.city, u.country].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)', fill: 'var(--color-accent)' }} />
                          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{u.points}</span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {leaders.length === 0 && (
              <div className="text-center py-20">
                <Trophy className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No rankings yet</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Send gifts to earn points and appear here!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Podium card ───────────────────────────────────────────────────────────────
function PodiumCard({ user: u, rank, delay, isMe }: { user: LeaderboardUser; rank: 1 | 2 | 3; delay: number; isMe: boolean }) {
  const cfg = RANK_CONFIG[rank];
  const heights = { 1: 'pt-0', 2: 'pt-8', 3: 'pt-14' };
  const avatarSizes = { 1: 14, 2: 11, 3: 10 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', damping: 20 }}
      className={`flex flex-col items-center gap-2 ${heights[rank]}`}
    >
      {/* Rank badge */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: cfg.bg, color: cfg.text, boxShadow: cfg.glow }}>
        {cfg.icon}
      </div>

      {/* Avatar */}
      <Link href={`/users/${u.id}`} className="cursor-pointer">
        <div className="relative">
          <div
            className="rounded-full overflow-hidden border-4"
            style={{
              borderColor: isMe ? 'var(--color-brand)' : 'transparent',
              boxShadow: cfg.glow,
              width: `${avatarSizes[rank] * 4}px`,
              height: `${avatarSizes[rank] * 4}px`,
            }}
          >
            {u.avatar_url ? (
              <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center font-black text-white"
                style={{ background: `hsl(${u.name.charCodeAt(0) * 137 % 360},60%,52%)`, fontSize: rank === 1 ? '1.75rem' : '1.25rem' }}
              >
                {u.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Name */}
      <p className="text-[10px] sm:text-xs font-bold text-center max-w-[64px] sm:max-w-[80px] truncate" style={{ color: 'var(--text-primary)' }}>
        {u.name}
      </p>

      {/* Points */}
      <div className="flex items-center gap-1 rounded-full px-2 py-1"
        style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
        <Star className="w-3 h-3 fill-current" />
        <span className="text-[10px] sm:text-xs font-bold">{u.points}</span>
      </div>

      {/* Podium base */}
      <div
        className="w-14 sm:w-20 rounded-t-xl flex items-center justify-center"
        style={{
          height: rank === 1 ? '50px' : rank === 2 ? '36px' : '26px',
          background: cfg.bg,
          boxShadow: cfg.glow,
        }}
      >
        <span className="text-white font-black text-base sm:text-lg">#{rank}</span>
      </div>
    </motion.div>
  );
}
