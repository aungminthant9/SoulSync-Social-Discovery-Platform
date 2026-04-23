'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Heart,
  Clock,
  MessageCircle,
  Check,
  X,
  Loader2,
  Users,
  Star,
  MapPin,
  UserMinus,
  Eye,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestUser = {
  id: string;
  name: string;
  avatar_url?: string | null;
  city?: string | null;
  country?: string | null;
  points?: number;
};

type IncomingRequest = {
  id: string;
  status: string;
  created_at: string;
  sender_id: string;
  sender: RequestUser;
};

type OutgoingRequest = {
  id: string;
  status: string;
  created_at: string;
  receiver_id: string;
  receiver: RequestUser;
};

type Match = {
  matchId: string;
  createdAt: string;
  user: RequestUser & { bio?: string | null; interests?: string[] };
};

// ─── Avatar (module-level) ────────────────────────────────────────────────────

function Avatar({ user, size = 12 }: { user: RequestUser; size?: number }) {
  const hue = user.name ? user.name.charCodeAt(0) * 137 : 0;
  const bg = `hsl(${hue % 360}, 60%, 55%)`;
  const dim = `${size * 4}px`;
  if (user.avatar_url) {
    return <img src={user.avatar_url} alt={user.name} className="rounded-full object-cover" style={{ width: dim, height: dim }} />;
  }
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: dim, height: dim, background: bg, fontSize: size < 10 ? '0.9rem' : '1.2rem' }}>
      {user.name?.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── EmptyState (module-level) ────────────────────────────────────────────────

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--color-brand-subtle)' }}>
        <Icon className="w-7 h-7" style={{ color: 'var(--color-brand)' }} />
      </div>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{text}</p>
    </motion.div>
  );
}

// ─── IncomingCard (module-level) ──────────────────────────────────────────────

type IncomingCardProps = {
  req: IncomingRequest;
  isResponding: boolean;
  respondingDisabled: boolean;
  onAccept: () => void;
  onReject: () => void;
};

function IncomingCard({ req, isResponding, respondingDisabled, onAccept, onReject }: IncomingCardProps) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }}
      className="card p-4 flex items-center gap-4">
      <Avatar user={req.sender} size={11} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{req.sender.name}</p>
        {(req.sender.city || req.sender.country) && (
          <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            <MapPin className="w-3 h-3 shrink-0" />
            {[req.sender.city, req.sender.country].filter(Boolean).join(', ')}
          </p>
        )}
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>wants to connect with you</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={onAccept} disabled={respondingDisabled}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'rgba(42,181,126,0.12)', color: 'var(--color-success)' }} title="Accept">
          {isResponding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </button>
        <button onClick={onReject} disabled={respondingDisabled}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'rgba(224,82,82,0.1)', color: 'var(--color-error)' }} title="Reject">
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── OutgoingCard (module-level) ──────────────────────────────────────────────

function OutgoingCard({ req }: { req: OutgoingRequest }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="card p-4 flex items-center gap-4">
      <Avatar user={req.receiver} size={11} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{req.receiver.name}</p>
        {(req.receiver.city || req.receiver.country) && (
          <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            <MapPin className="w-3 h-3 shrink-0" />
            {[req.receiver.city, req.receiver.country].filter(Boolean).join(', ')}
          </p>
        )}
      </div>
      <span className="badge" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', fontSize: '0.7rem' }}>
        <Clock className="w-3 h-3" /> Pending
      </span>
    </motion.div>
  );
}

// ─── MatchCard (module-level) ─────────────────────────────────────────────────

type MatchCardProps = {
  match: Match;
  isUnmatching: boolean;
  onUnmatch: () => void;
};

function MatchCard({ match, isUnmatching, onUnmatch }: MatchCardProps) {
  if (!match.user) return null;
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
      className="card p-4">
      <div className="flex items-center gap-4">
        <Avatar user={match.user} size={12} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{match.user.name}</p>
          {(match.user.city || match.user.country) && (
            <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              <MapPin className="w-3 h-3 shrink-0" />
              {[match.user.city, match.user.country].filter(Boolean).join(', ')}
            </p>
          )}
          {match.user.points != null && (
            <span className="badge badge-teal mt-1" style={{ fontSize: '0.65rem' }}>
              <Star className="w-3 h-3" />{match.user.points} pts
            </span>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex gap-2 mt-3">
        <Link href={`/users/${match.user.id}`}
          className="btn-secondary flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium">
          <Eye className="w-3.5 h-3.5" /> Profile
        </Link>

        <Link href={`/chat/${match.matchId}`}
          className="btn-primary flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium">
          <MessageCircle className="w-3.5 h-3.5" /> Chat
        </Link>

        <button type="button" onClick={onUnmatch} disabled={isUnmatching}
          className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'rgba(224,82,82,0.08)', color: 'var(--color-error)' }} title="Unmatch">
          {isUnmatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'pending' | 'matches';

export default function MatchesPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('pending');
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [unmatchingId, setUnmatchingId] = useState<string | null>(null);
  const [confirmUnmatch, setConfirmUnmatch] = useState<Match | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [reqData, matchData] = await Promise.all([
        api<{ incoming: IncomingRequest[]; outgoing: OutgoingRequest[] }>('/api/matches/requests', { token }),
        api<{ matches: Match[] }>('/api/matches', { token }),
      ]);
      setIncoming(reqData.incoming);
      setOutgoing(reqData.outgoing);
      setMatches(matchData.matches);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user && token) fetchAll();
  }, [user, token, fetchAll]);

  const handleRespond = async (requestId: string, action: 'accept' | 'reject') => {
    if (!token) return;
    setRespondingId(requestId);
    try {
      await api('/api/matches/respond', { method: 'PUT', token, body: { requestId, action } });
      await fetchAll();
    } catch (err) { console.error(err); }
    finally { setRespondingId(null); }
  };

  const handleUnmatch = async (matchId: string) => {
    if (!token) return;
    setUnmatchingId(matchId);
    setConfirmUnmatch(null);
    try {
      await api(`/api/matches/${matchId}`, { method: 'DELETE', token });
      await fetchAll();
    } catch (err) { console.error(err); }
    finally { setUnmatchingId(null); }
  };

  if (authLoading || (!user && !authLoading)) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 spinner" /></div>;
  }

  const pendingCount = incoming.length;
  const matchCount = matches.length;

  return (
    <>
      <div className="mesh-bg min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto relative z-10">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Your <span style={{ color: 'var(--color-brand)' }}>Connections</span>
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Manage your match requests and conversations
            </p>
          </motion.div>

          {/* Tabs */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--bg-elevated)' }}>
            {([
              { id: 'pending', label: 'Requests', icon: Clock, count: pendingCount },
              { id: 'matches', label: 'Matches', icon: Heart, count: matchCount },
            ] as const).map(({ id, label, icon: Icon, count }) => (
              <button key={id} type="button" onClick={() => setTab(id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: tab === id ? 'var(--bg-card)' : 'transparent',
                  color: tab === id ? 'var(--color-brand)' : 'var(--text-secondary)',
                  boxShadow: tab === id ? 'var(--shadow-sm)' : 'none',
                }}>
                <Icon className="w-4 h-4" />
                {label}
                {count > 0 && (
                  <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ background: 'var(--color-brand)', color: 'white' }}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </motion.div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--color-brand)' }} /></div>
          ) : (
            <AnimatePresence mode="wait">
              {/* Requests tab */}
              {tab === 'pending' && (
                <motion.div key="pending" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                  {/* Incoming */}
                  <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                      Incoming ({incoming.length})
                    </p>
                    {incoming.length === 0 ? (
                      <div className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No incoming requests</div>
                    ) : (
                      <AnimatePresence>
                        <div className="space-y-3">
                          {incoming.map((req) => (
                            <IncomingCard key={req.id} req={req}
                              isResponding={respondingId === req.id}
                              respondingDisabled={!!respondingId}
                              onAccept={() => handleRespond(req.id, 'accept')}
                              onReject={() => handleRespond(req.id, 'reject')}
                            />
                          ))}
                        </div>
                      </AnimatePresence>
                    )}
                  </div>

                  {/* Outgoing */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                      Sent ({outgoing.length})
                    </p>
                    {outgoing.length === 0 ? (
                      <div className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No outgoing requests</div>
                    ) : (
                      <div className="space-y-3">
                        {outgoing.map((req) => <OutgoingCard key={req.id} req={req} />)}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Matches tab */}
              {tab === 'matches' && (
                <motion.div key="matches" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                  {matches.length === 0 ? (
                    <EmptyState icon={Users} text="No matches yet — go discover people and send connect requests!" />
                  ) : (
                    <div className="space-y-3">
                      {matches.map((m) => (
                        <MatchCard
                          key={m.matchId}
                          match={m}
                          isUnmatching={unmatchingId === m.matchId}
                          onUnmatch={() => setConfirmUnmatch(m)}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}

        </div>
      </div>

      {/* Unmatch confirmation modal */}
      <AnimatePresence>
        {confirmUnmatch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setConfirmUnmatch(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }} transition={{ type: 'spring', damping: 20 }}
              className="card-elevated p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto"
                style={{ background: 'rgba(224,82,82,0.1)' }}>
                <UserMinus className="w-6 h-6" style={{ color: 'var(--color-error)' }} />
              </div>
              <h3 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text-primary)' }}>
                Unmatch with {confirmUnmatch.user?.name}?
              </h3>
              <p className="text-sm text-center mb-5" style={{ color: 'var(--text-secondary)' }}>
                This will remove your connection and chat history. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setConfirmUnmatch(null)} className="flex-1 btn-secondary py-2.5 text-sm">
                  Cancel
                </button>
                <button type="button" onClick={() => handleUnmatch(confirmUnmatch.matchId)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all"
                  style={{ background: 'var(--color-error)', color: 'white' }}>
                  Unmatch
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
