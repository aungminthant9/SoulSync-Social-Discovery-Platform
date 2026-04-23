'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Users, Flag, Heart, Gift, ShieldAlert, TrendingUp,
  AlertTriangle, CheckCircle, Clock, Loader2, Tv2,
} from 'lucide-react';

type Stats = {
  totalUsers: number; newUsersToday: number; totalMatches: number;
  totalReports: number; flaggedReports: number; openReports: number;
  totalGifts: number; suspendedUsers: number; bannedUsers: number;
  totalAdViews: number; adViewsToday: number;
};
type Report = {
  id: string; reason: string; ai_verdict: string; ai_explanation: string;
  status: string; created_at: string;
  reporter: { name: string } | null;
  reported: { name: string; is_suspended: boolean; is_banned: boolean } | null;
};

const CARD_STYLE: React.CSSProperties = {
  background: '#0F172A', border: '1px solid #1E293B', borderRadius: 16,
  padding: '20px 24px',
};
const LABEL_STYLE: React.CSSProperties = { color: '#64748B', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 };
const VALUE_STYLE: React.CSSProperties = { color: '#F8FAFC', fontSize: 28, fontWeight: 700, margin: '6px 0 0', fontFamily: 'Fira Code, monospace' };

function StatCard({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: number | undefined; color: string; sub?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={CARD_STYLE}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={LABEL_STYLE}>{label}</p>
          <p style={VALUE_STYLE}>{value ?? '—'}</p>
          {sub && <p style={{ color: '#64748B', fontSize: 12, margin: '4px 0 0' }}>{sub}</p>}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: 20, height: 20, color }} />
        </div>
      </div>
    </motion.div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const cfg: Record<string, { color: string; bg: string; label: string }> = {
    flagged: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'Flagged' },
    safe: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)', label: 'Safe' },
    pending: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Pending' },
  };
  const c = cfg[verdict] ?? cfg.pending;
  return (
    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: c.color, background: c.bg, border: `1px solid ${c.color}33` }}>
      {c.label}
    </span>
  );
}

export default function AdminOverviewPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api<Stats>('/api/admin/stats', { token }),
      api<{ reports: Report[] }>('/api/admin/reports?status=open&limit=5', { token }),
    ]).then(([s, r]) => {
      setStats(s);
      setRecentReports(r.reports || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <Loader2 style={{ width: 32, height: 32, color: '#22C55E', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#F8FAFC', fontSize: 22, fontWeight: 700, margin: '0 0 4px', fontFamily: 'Fira Sans, sans-serif' }}>Dashboard Overview</h1>
        <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>Platform-wide metrics and recent activity</p>
      </div>

      {/* ── Stat cards grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers} color="#22C55E" sub={`+${stats?.newUsersToday ?? 0} today`} />
        <StatCard icon={Heart} label="Total Matches" value={stats?.totalMatches} color="#E8604C" />
        <StatCard icon={Flag} label="Open Reports" value={stats?.openReports} color="#F59E0B" sub={`${stats?.flaggedReports ?? 0} AI-flagged`} />
        <StatCard icon={Gift} label="Gifts Sent" value={stats?.totalGifts} color="#A78BFA" />
        <StatCard icon={ShieldAlert} label="Suspended" value={stats?.suspendedUsers} color="#F97316" />
        <StatCard icon={AlertTriangle} label="Banned" value={stats?.bannedUsers} color="#EF4444" />
        <StatCard icon={Tv2} label="Ads Watched" value={stats?.totalAdViews} color="#D4A853" sub={`+${stats?.adViewsToday ?? 0} today`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent open reports */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={CARD_STYLE}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ color: '#F8FAFC', fontSize: 15, fontWeight: 700, margin: 0 }}>Recent Open Reports</h2>
            <Link href="/admin/reports" style={{ color: '#22C55E', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          {recentReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569' }}>
              <CheckCircle style={{ width: 32, height: 32, margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: 14 }}>All clear — no open reports!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentReports.map((r) => (
                <div key={r.id} style={{ padding: '12px 14px', background: '#1E293B', borderRadius: 10, border: r.ai_verdict === 'flagged' ? '1px solid rgba(239,68,68,0.2)' : '1px solid #1E293B' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 600 }}>
                      {r.reporter?.name ?? '?'} → {r.reported?.name ?? '?'}
                    </span>
                    <VerdictBadge verdict={r.ai_verdict} />
                  </div>
                  <p style={{ color: '#94A3B8', fontSize: 12, margin: 0 }}>{r.reason}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={CARD_STYLE}>
          <h2 style={{ color: '#F8FAFC', fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { href: '/admin/reports?status=open', icon: Flag, label: 'Review Open Reports', sub: `${stats?.openReports ?? 0} pending`, color: '#F59E0B' },
              { href: '/admin/reports?verdict=flagged', icon: ShieldAlert, label: 'AI-Flagged Reports', sub: `${stats?.flaggedReports ?? 0} flagged`, color: '#EF4444' },
              { href: '/admin/users?status=suspended', icon: Clock, label: 'Suspended Users', sub: `${stats?.suspendedUsers ?? 0} active`, color: '#F97316' },
              { href: '/admin/users', icon: Users, label: 'Manage All Users', sub: `${stats?.totalUsers ?? 0} total`, color: '#22C55E' },
              { href: '/admin/economy', icon: TrendingUp, label: 'Economy Overview', sub: `${stats?.totalGifts ?? 0} gifts total`, color: '#A78BFA' },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#1E293B', borderRadius: 10, textDecoration: 'none', transition: 'background 0.15s', cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: item.color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon style={{ width: 18, height: 18, color: item.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>{item.label}</p>
                  <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>{item.sub}</p>
                </div>
                <span style={{ color: '#334155', fontSize: 18 }}>›</span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
