'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import PhotoGallery from '@/components/PhotoGallery';
import {
  MapPin, Star, Calendar, ArrowLeft, SendHorizonal, Check,
  Loader2, EyeOff, Venus, Mars, CircleDot, MessageCircle, UserCheck, Lock, Flag, X, AlertCircle, Coins, Gift,
} from 'lucide-react';
import { HOBBY_MAP } from '@/components/HobbyPicker';
import VibeCheckModal from '@/components/VibeCheckModal';

type PublicUser = {
  id: string; name: string; age?: number | null; gender?: string; city?: string; country?: string;
  bio?: string; interests?: string[]; avatar_url?: string; points?: number;
  is_blurred?: boolean; created_at?: string; total_credits_spent?: number;
};

function GenderIcon({ gender }: { gender?: string }) {
  if (!gender) return null;
  const g = gender.toLowerCase();
  if (g === 'female' || g === 'woman') return <Venus className="w-3.5 h-3.5" style={{ color: '#e879f9' }} />;
  if (g === 'male' || g === 'man') return <Mars className="w-3.5 h-3.5" style={{ color: '#60a5fa' }} />;
  return <CircleDot className="w-3.5 h-3.5" style={{ color: 'var(--color-teal)' }} />;
}

const TAG_STYLES = [
  { background: 'rgba(232,96,76,0.12)', color: '#E8604C' },
  { background: 'rgba(42,181,160,0.12)', color: '#2AB5A0' },
  { background: 'rgba(212,168,83,0.12)', color: '#D4A853' },
  { background: 'rgba(123,97,255,0.12)', color: '#7B61FF' },
];

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: me, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [matched, setMatched] = useState(false);
  const [existingMatchId, setExistingMatchId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState('');
  const [showVibeCheck, setShowVibeCheck] = useState(false);

  useEffect(() => { if (!authLoading && !me) router.push('/login'); }, [me, authLoading, router]);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    Promise.all([
      api<{ user: PublicUser }>(`/api/users/${id}`, { token }),
      api<{ matches: { matchId: string; user: { id: string } }[] }>('/api/matches', { token }),
    ])
      .then(([pd, md]) => {
        setProfile(pd.user);
        const m = md.matches.find((m) => m.user?.id === id);
        if (m) { setExistingMatchId(m.matchId); setMatched(true); }
      })
      .catch(() => setError('User not found.'))
      .finally(() => setLoading(false));
  }, [token, id]);

  const handleConnect = async () => {
    if (!token || requested || matched) return;
    setRequesting(true);
    try {
      const data = await api<{ matched?: boolean }>('/api/matches/request', { method: 'POST', token, body: { receiverId: id } });
      if (data.matched) setMatched(true); else setRequested(true);
    } catch { setRequested(true); }
    finally { setRequesting(false); }
  };

  const handleReport = async () => {
    if (!token || !reportReason.trim()) return;
    setReporting(true); setReportError('');
    try {
      await api('/api/reports', { method: 'POST', token, body: { reportedId: id, reason: reportReason.trim() } });
      setReportDone(true);
    } catch (err: any) {
      setReportError(err?.message || 'Failed to submit report.');
    } finally { setReporting(false); }
  };

  const hue = profile?.name ? profile.name.charCodeAt(0) * 137 : 0;
  const hue2 = (hue + 55) % 360;
  const avatarGradient = `linear-gradient(145deg, hsl(${hue % 360},65%,52%), hsl(${hue2},70%,42%))`;
  const bannerGradient = `linear-gradient(135deg, hsl(${hue % 360},50%,60%) 0%, hsl(${hue2},55%,45%) 100%)`;
  const isOwn = me?.id === id;

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 spinner" />
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p style={{ color: 'var(--text-secondary)' }}>{error || 'User not found.'}</p>
      <Link href="/discover" className="btn-primary px-5 py-2.5 text-sm">Back to Discover</Link>
    </div>
  );

  return (
    <div className="mesh-bg min-h-screen pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-6 relative z-10">

        {/* Back button */}
        <motion.button initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm mb-4 cursor-pointer transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.button>

        {/* ── Profile hero card ──────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden mb-4"
          style={{ borderRadius: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}>

          {/* Banner */}
          <div className="relative h-36" style={{ background: bannerGradient }}>
            {/* Privacy badge */}
            {profile.is_blurred && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}>
                <Lock className="w-3 h-3" /> Private Profile
              </div>
            )}
            {/* Decorative blobs */}
            <div className="absolute inset-0 opacity-20"
              style={{ background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.4), transparent 60%)' }} />
          </div>

          {/* Avatar strip */}
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-14 mb-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.name}
                    className={`w-24 h-24 rounded-2xl object-cover border-4 shadow-lg ${profile.is_blurred ? 'blur-md' : ''}`}
                    style={{ borderColor: 'var(--bg-card)' }} />
                ) : (
                  <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-black text-white shadow-lg border-4 ${profile.is_blurred ? 'blur-sm' : ''}`}
                    style={{ background: avatarGradient, borderColor: 'var(--bg-card)' }}>
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Points + gift spent badges */}
              <div className="flex gap-2 flex-wrap justify-end">
                <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold"
                  style={{ background: 'var(--color-teal-subtle)', color: 'var(--color-teal)' }}>
                  <Star className="w-3.5 h-3.5" style={{ fill: 'var(--color-teal)' }} />
                  {profile.points ?? 0} pts
                </div>
                <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold"
                  style={{ background: 'rgba(212,168,83,0.12)', color: '#D4A853', border: '1px solid rgba(212,168,83,0.2)' }}>
                  <Gift className="w-3.5 h-3.5" />
                  {profile.total_credits_spent ?? 0} spent on gifts
                </div>
              </div>
            </div>

            {/* Name + meta */}
            <div className="mb-4">
              <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {profile.is_blurred ? '••••••••' : profile.name}
              </h1>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.gender && !profile.is_blurred && (
                  <span className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium capitalize"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <GenderIcon gender={profile.gender} />{profile.gender}
                  </span>
                )}
                {!profile.is_blurred && profile.age != null && (
                  <span className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <Calendar className="w-3 h-3" />Age {profile.age}
                  </span>
                )}
                {!profile.is_blurred && (profile.city || profile.country) && (
                  <span className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <MapPin className="w-3 h-3" />{[profile.city, profile.country].filter(Boolean).join(', ')}
                  </span>
                )}
                {profile.created_at && (
                  <span className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                    <Calendar className="w-3 h-3" />
                    Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>

            {/* Private notice */}
            {profile.is_blurred && !isOwn && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl mb-4 text-sm"
                style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.2)', color: 'var(--color-accent)' }}>
                <EyeOff className="w-4 h-4 shrink-0" />
                This profile is private. Connect with them to see full details.
              </div>
            )}

            {/* Bio */}
            {!profile.is_blurred && profile.bio && (
              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>About</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{profile.bio}</p>
              </div>
            )}

            {/* Hobbies & Interests */}
            {!profile.is_blurred && profile.interests && profile.interests.length > 0 && (
              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>Hobbies &amp; Interests</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {profile.interests.map((tag, i) => {
                    const emoji = HOBBY_MAP[tag] || HOBBY_MAP[tag.toLowerCase()] || '🏷️';
                    return (
                      <span key={tag} style={{
                        ...TAG_STYLES[i % TAG_STYLES.length],
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600,
                      }}>
                        <span style={{ fontSize: 14 }}>{emoji}</span> {tag}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="h-px mb-4" style={{ background: 'var(--border-subtle)' }} />

            {/* Actions */}
            {!isOwn && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  {existingMatchId ? (
                    <Link href={`/chat/${existingMatchId}`}
                      className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl">
                      <MessageCircle className="w-4 h-4" /> Open Chat
                    </Link>
                  ) : matched ? (
                    <div className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl"
                      style={{ background: 'var(--color-success)', color: 'white' }}>
                      <UserCheck className="w-4 h-4" /> Matched!
                    </div>
                  ) : (
                    <button onClick={handleConnect}
                      disabled={profile.is_blurred || requested || requesting}
                      className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl"
                      style={requested && !requesting ? { background: 'var(--color-success)', boxShadow: 'none' } : undefined}>
                      {requesting ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> :
                       requested ? <><Check className="w-4 h-4" />Request Sent</> :
                       <><SendHorizonal className="w-4 h-4" />Connect</>}
                    </button>
                  )}
                </div>
                {/* Vibe Check button */}
                {!profile.is_blurred && (
                  <button
                    type="button"
                    onClick={() => setShowVibeCheck(true)}
                    className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold rounded-xl cursor-pointer transition-all"
                    style={{ background: 'linear-gradient(135deg, rgba(232,96,76,0.15), rgba(168,85,247,0.15))', border: '1.5px solid rgba(232,96,76,0.35)', color: 'var(--text-primary)' }}
                  >
                    <span style={{ fontSize: 16 }}>✨</span> Check Vibe
                    <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, background: 'rgba(212,168,83,0.15)', color: '#D4A853', fontWeight: 700, marginLeft: 2 }}>5 credits</span>
                  </button>
                )}
                {/* Report button */}
                <button
                  type="button"
                  onClick={() => { setShowReport(true); setReportDone(false); setReportReason(''); setReportError(''); }}
                  className="flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg cursor-pointer transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Flag className="w-3 h-3" /> Report this user
                </button>
              </div>
            )}

            {isOwn && (
              <Link href="/profile"
                className="block w-full btn-secondary text-center py-3 text-sm font-semibold rounded-xl">
                Edit My Profile
              </Link>
            )}
          </div>
        </motion.div>

        {/* ── Photo Gallery ───────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          style={{ borderRadius: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
          className="p-6">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Photos</p>
          <PhotoGallery userId={id as string} editable={isOwn}
            locked={!!(profile.is_blurred && !existingMatchId && !isOwn)} />
        </motion.div>

      </div>

      {/* ── Report Modal ─────────────────────────────────────────────── */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowReport(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xl)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(224,82,82,0.12)' }}>
                  <Flag className="w-4 h-4" style={{ color: 'var(--color-error)' }} />
                </div>
                <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Report User</h2>
              </div>
              <button type="button" onClick={() => setShowReport(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportDone ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(42,181,126,0.12)' }}>
                  <Check className="w-7 h-7" style={{ color: 'var(--color-success)' }} />
                </div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Report Submitted</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Our AI Safety Shield has reviewed your report. Thank you for keeping SoulSync safe.
                </p>
                <button type="button" onClick={() => setShowReport(false)}
                  className="btn-primary mt-5 px-6 py-2.5 text-sm">
                  Done
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                  Reporting <strong style={{ color: 'var(--text-primary)' }}>{profile.name}</strong>. Our AI Safety Shield will review your report immediately.
                </p>

                {reportError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl mb-3 text-xs"
                    style={{ background: 'rgba(224,82,82,0.1)', color: 'var(--color-error)', border: '1px solid rgba(224,82,82,0.2)' }}>
                    <AlertCircle className="w-4 h-4 shrink-0" />{reportError}
                  </div>
                )}

                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Reason for report</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {['Harassment', 'Inappropriate content', 'Spam or scam', 'Fake profile', 'Threatening behavior', 'Other'].map((r) => (
                    <button key={r} type="button"
                      onClick={() => setReportReason(r)}
                      className="text-left text-xs px-3 py-2.5 rounded-xl transition-all cursor-pointer"
                      style={{
                        background: reportReason === r ? 'var(--color-brand-subtle)' : 'var(--bg-elevated)',
                        border: `1px solid ${reportReason === r ? 'var(--color-brand)' : 'var(--border-subtle)'}`,
                        color: reportReason === r ? 'var(--color-brand)' : 'var(--text-secondary)',
                        fontWeight: reportReason === r ? 600 : 400,
                      }}>
                      {r}
                    </button>
                  ))}
                </div>

                <button type="button" onClick={handleReport}
                  disabled={!reportReason.trim() || reporting}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  style={{
                    background: reportReason.trim() ? 'var(--color-error)' : 'var(--bg-elevated)',
                    color: reportReason.trim() ? 'white' : 'var(--text-muted)',
                    opacity: reporting ? 0.7 : 1,
                  }}>
                  {reporting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : <><Flag className="w-4 h-4" />Submit Report</>}
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Vibe Check Modal */}
      {showVibeCheck && profile && me && token && (
        <VibeCheckModal
          targetId={id as string}
          targetName={profile.name}
          targetAvatar={profile.avatar_url}
          myName={me.name}
          myAvatar={me.avatar_url}
          token={token}
          matchId={existingMatchId}
          onClose={() => setShowVibeCheck(false)}
        />
      )}
    </div>
  );
}

