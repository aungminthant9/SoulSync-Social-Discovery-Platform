'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import SoulCanvas from '@/components/SoulCanvas';
import Link from 'next/link';
import { ArrowLeft, Loader2, PaintbrushIcon } from 'lucide-react';
import { motion } from 'framer-motion';

type MatchInfo = {
  matchId: string;
  user: { id: string; name: string; avatar_url?: string | null };
};

function Avatar({ name, avatar_url }: { name: string; avatar_url?: string | null }) {
  const hue = name ? name.charCodeAt(0) * 137 : 0;
  const bg = `hsl(${hue % 360}, 60%, 55%)`;
  if (avatar_url)
    return <img src={avatar_url} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />;
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
      style={{ background: bg }}>
      {name?.charAt(0).toUpperCase()}
    </div>
  );
}

export default function CanvasPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [partner, setPartner] = useState<MatchInfo['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cache the token in a ref so a brief null during screen-share
  // capture startup doesn't unmount the canvas and trigger a 404.
  const stableToken = useRef<string | null>(token);
  useEffect(() => {
    if (token) stableToken.current = token;
  }, [token]);

  // Auth guard — delay redirect until auth has fully loaded to avoid
  // false positives from the brief loading flash when screen-sharing.
  useEffect(() => {
    if (!authLoading && !user && !stableToken.current) router.push('/login');
  }, [user, authLoading, router]);

  // Fetch partner info
  useEffect(() => {
    if (!token || !matchId) return;
    api<{ matches: MatchInfo[] }>('/api/matches', { token })
      .then((d) => {
        const match = d.matches.find((m) => m.matchId === matchId);
        if (match) {
          setPartner(match.user);
        } else {
          setError('Match not found. You may not be part of this match.');
        }
      })
      .catch(() => setError('Failed to load match info.'))
      .finally(() => setLoading(false));
  }, [token, matchId]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--color-brand-subtle)' }}>
          <PaintbrushIcon className="w-6 h-6" style={{ color: 'var(--color-brand)' }} />
        </div>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading Soul Canvas…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--bg-elevated)' }}>
          <PaintbrushIcon className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
        </div>
        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{error}</p>
        <Link href={`/chat/${matchId}`} className="btn-primary px-5 py-2 text-sm">
          Back to Chat
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>

        {/* Back to chat */}
        <Link
          href={`/chat/${matchId}`}
          className="p-1.5 rounded-lg transition-colors cursor-pointer"
          style={{ color: 'var(--text-secondary)' }}
          title="Back to chat"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-brand-subtle)' }}>
            <PaintbrushIcon className="w-4 h-4" style={{ color: 'var(--color-brand)' }} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-none" style={{ color: 'var(--text-primary)' }}>
              Soul Canvas
            </p>
            {partner && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Drawing with {partner.name}
              </p>
            )}
          </div>
        </div>

        {/* Partner avatar */}
        {partner && (
          <div className="flex items-center gap-2">
            <Avatar name={partner.name} avatar_url={partner.avatar_url} />
            <span className="hidden sm:inline text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {partner.name}
            </span>
          </div>
        )}
      </div>

      {/* ── Canvas ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {/* Use stableToken so a brief null during screen-share capture doesn't kill the session */}
        {(token || stableToken.current) && user && matchId && matchId !== 'undefined' && (
          <SoulCanvas
            matchId={matchId}
            token={(token || stableToken.current)!}
            userId={user.id}
            partnerName={partner?.name}
          />
        )}
      </div>
    </motion.div>
  );
}
