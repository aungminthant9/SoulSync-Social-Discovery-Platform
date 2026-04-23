'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Star, Lock } from 'lucide-react';

export type DiscoverUser = {
  id: string;
  name: string;
  avatar_url?: string | null;
  is_blurred: boolean;
  age: number | null;
  city?: string | null;
  country?: string | null;
  bio?: string | null;
  interests: string[];
  points: number;
  gender?: string | null;
};

type UserCardProps = {
  user: DiscoverUser;
  index?: number;
  initialRequested?: boolean;
};

export default function UserCard({ user, index = 0, initialRequested = false }: UserCardProps) {
  const { token } = useAuth();
  const [starred, setStarred] = useState(initialRequested);
  const [sending, setSending] = useState(false);
  const [matched, setMatched] = useState(false);

  // Fallback gradient avatar
  const hue = user.name ? user.name.charCodeAt(0) * 137 : 0;
  const hue2 = (hue + 55) % 360;
  const avatarGradient = `linear-gradient(145deg, hsl(${hue % 360},65%,42%), hsl(${hue2},70%,32%))`;
  const initial = user.name?.charAt(0).toUpperCase() ?? '?';

  const handleStar = async () => {
    if (!token || starred || matched || sending) return;
    setSending(true);
    try {
      const data = await api<{ matched?: boolean; message: string }>(
        '/api/matches/request',
        { method: 'POST', token, body: { receiverId: user.id } }
      );
      if (data.matched) setMatched(true);
      else setStarred(true);
    } catch {
      setStarred(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.38,
        delay: Math.min(index * 0.06, 0.5),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ scale: 1.025, transition: { duration: 0.22, ease: 'easeOut' } }}
      className="group relative overflow-hidden cursor-pointer select-none"
      style={{
        borderRadius: '1.25rem',
        aspectRatio: '3/4',
        background: '#111',
        boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
      }}
    >
      <Link href={`/users/${user.id}`} className="absolute inset-0 z-10" aria-label={`View ${user.name}'s profile`} />

      {/* ── Photo / Avatar ── */}
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.name}
          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${
            user.is_blurred ? 'blur-2xl scale-110' : ''
          }`}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: avatarGradient }}
        >
          <span
            className={`text-7xl font-black text-white/80 ${user.is_blurred ? 'blur-sm' : ''}`}
            style={{ textShadow: '0 2px 16px rgba(0,0,0,0.3)' }}
          >
            {initial}
          </span>
        </div>
      )}

      {/* ── Dark vignette gradient overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 68%, rgba(0,0,0,0.92) 100%)',
        }}
      />

      {/* ── Private lock overlay ── */}
      {user.is_blurred && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-20"
          style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(6px)' }}
          >
            <Lock className="w-5 h-5 text-white" />
          </div>
          <span className="text-[11px] font-semibold text-white/70 tracking-wider uppercase">
            Private Profile
          </span>
        </div>
      )}

      {/* ── Bottom info overlay ── */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10 flex items-end justify-between z-20">
        {/* Left: status + name */}
        <div className="flex flex-col gap-1 min-w-0">
          {/* Recently Active pill */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: '#22c55e',
                boxShadow: '0 0 6px rgba(34,197,94,0.8)',
              }}
            />
            <span className="text-[11px] font-medium text-white/80 tracking-wide">
              Recently Active
            </span>
          </div>

          {/* Name */}
          <h3 className="font-bold text-white leading-tight truncate" style={{ fontSize: '1.15rem' }}>
            {user.is_blurred ? '••••••' : user.name}
          </h3>
        </div>

        {/* Right: Star / Connect button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleStar();
          }}
          disabled={user.is_blurred || starred || matched || sending}
          aria-label={starred || matched ? 'Requested' : 'Connect'}
          className="relative z-30 shrink-0 flex items-center justify-center rounded-full cursor-pointer disabled:cursor-not-allowed transition-transform duration-200 hover:scale-110 active:scale-95"
          style={{
            width: '2.5rem',
            height: '2.5rem',
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(255,255,255,0.18)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          }}
        >
          <Star
            className="w-4.5 h-4.5 transition-colors duration-200"
            style={{
              width: '1.1rem',
              height: '1.1rem',
              color: starred || matched ? '#22d3ee' : 'rgba(255,255,255,0.85)',
              fill: starred || matched ? '#22d3ee' : 'transparent',
              filter: starred || matched ? 'drop-shadow(0 0 6px rgba(34,211,238,0.7))' : 'none',
            }}
          />
        </button>
      </div>
    </motion.div>
  );
}
