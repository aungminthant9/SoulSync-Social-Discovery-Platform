'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { Coins, Star, Gift, TrendingUp, Loader2, ArrowRight } from 'lucide-react';

type GiftTx = {
  id: string; created_at: string;
  sender: { id: string; name: string; avatar_url?: string } | null;
  receiver: { id: string; name: string; avatar_url?: string } | null;
  sticker: { name: string; icon: string; price_credits: number; point_value: number } | null;
};
type EconomyData = {
  recentGifts: GiftTx[];
  giftsToday: number;
  totalCredits: number;
  totalPoints: number;
};

const CARD_STYLE: React.CSSProperties = {
  background: '#0F172A', border: '1px solid #1E293B', borderRadius: 16, padding: '20px 24px',
};

function MiniAvatar({ name, avatar_url }: { name: string; avatar_url?: string }) {
  const hue = name.charCodeAt(0) * 137 % 360;
  if (avatar_url) return <img src={avatar_url} alt={name} style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />;
  return <div style={{ width: 28, height: 28, borderRadius: 7, background: `hsl(${hue},55%,38%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{name.charAt(0).toUpperCase()}</div>;
}

export default function AdminEconomyPage() {
  const { token } = useAuth();
  const [data, setData] = useState<EconomyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api<EconomyData>('/api/admin/economy', { token })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <Loader2 style={{ width: 28, height: 28, color: '#22C55E', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // Compute top senders & receivers from recentGifts
  const senderMap: Record<string, { name: string; avatar_url?: string; count: number; credits: number }> = {};
  const receiverMap: Record<string, { name: string; avatar_url?: string; count: number; points: number }> = {};
  data?.recentGifts.forEach(tx => {
    if (tx.sender) {
      const k = tx.sender.id;
      if (!senderMap[k]) senderMap[k] = { name: tx.sender.name, avatar_url: tx.sender.avatar_url, count: 0, credits: 0 };
      senderMap[k].count++;
      senderMap[k].credits += tx.sticker?.price_credits ?? 0;
    }
    if (tx.receiver) {
      const k = tx.receiver.id;
      if (!receiverMap[k]) receiverMap[k] = { name: tx.receiver.name, avatar_url: tx.receiver.avatar_url, count: 0, points: 0 };
      receiverMap[k].count++;
      receiverMap[k].points += tx.sticker?.point_value ?? 0;
    }
  });
  const topSenders = Object.values(senderMap).sort((a, b) => b.count - a.count).slice(0, 5);
  const topReceivers = Object.values(receiverMap).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#F8FAFC', fontSize: 22, fontWeight: 700, margin: '0 0 4px', fontFamily: 'Fira Sans, sans-serif' }}>Economy Overview</h1>
        <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>Gift transactions, credits, and points in circulation</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { icon: Coins, label: 'Total Credits in Circulation', value: data?.totalCredits?.toLocaleString() ?? '—', color: '#D4A853' },
          { icon: Star, label: 'Total Points in Circulation', value: data?.totalPoints?.toLocaleString() ?? '—', color: '#F59E0B' },
          { icon: Gift, label: 'Total Gift Transactions', value: data?.recentGifts.length ? `${data.recentGifts.length}+` : '0', color: '#A78BFA' },
          { icon: TrendingUp, label: 'Gifts Sent Today', value: String(data?.giftsToday ?? 0), color: '#22C55E' },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} style={CARD_STYLE}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>{card.label}</p>
                <p style={{ color: '#F8FAFC', fontSize: 26, fontWeight: 700, margin: '6px 0 0', fontFamily: 'Fira Code, monospace' }}>{card.value}</p>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: card.color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <card.icon style={{ width: 19, height: 19, color: card.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Top senders */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={CARD_STYLE}>
          <h2 style={{ color: '#F8FAFC', fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Top Gift Senders</h2>
          {topSenders.length === 0 ? <p style={{ color: '#475569', fontSize: 13 }}>No gift activity yet</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topSenders.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#334155', fontSize: 12, fontWeight: 700, width: 18, textAlign: 'right', flexShrink: 0, fontFamily: 'Fira Code, monospace' }}>#{i + 1}</span>
                  <MiniAvatar name={s.name} avatar_url={s.avatar_url} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: '#D4A853', fontSize: 12, fontWeight: 700, margin: 0, fontFamily: 'Fira Code, monospace' }}>{s.credits} cr</p>
                    <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{s.count} gifts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top receivers */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={CARD_STYLE}>
          <h2 style={{ color: '#F8FAFC', fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Top Gift Receivers</h2>
          {topReceivers.length === 0 ? <p style={{ color: '#475569', fontSize: 13 }}>No gift activity yet</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topReceivers.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#334155', fontSize: 12, fontWeight: 700, width: 18, textAlign: 'right', flexShrink: 0, fontFamily: 'Fira Code, monospace' }}>#{i + 1}</span>
                  <MiniAvatar name={r.name} avatar_url={r.avatar_url} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: '#F59E0B', fontSize: 12, fontWeight: 700, margin: 0, fontFamily: 'Fira Code, monospace' }}>{r.points} pts</p>
                    <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{r.count} received</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent gift transactions */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={CARD_STYLE}>
        <h2 style={{ color: '#F8FAFC', fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Recent Gift Transactions</h2>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', gap: 12, padding: '10px 0', borderBottom: '1px solid #1E293B', marginBottom: 8 }}>
          {['Sender', 'Receiver', 'Gift', 'Credits', 'Date'].map(h => (
            <span key={h} style={{ color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>

        {(data?.recentGifts ?? []).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#475569' }}>
            <Gift style={{ width: 36, height: 36, margin: '0 auto 8px', opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 14 }}>No gift transactions yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data!.recentGifts.map((tx, i) => (
              <div key={tx.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', gap: 12, padding: '10px 0', borderBottom: i < data!.recentGifts.length - 1 ? '1px solid rgba(30,41,59,0.7)' : 'none', alignItems: 'center' }}>
                {/* Sender */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MiniAvatar name={tx.sender?.name ?? '?'} avatar_url={tx.sender?.avatar_url} />
                  <span style={{ color: '#94A3B8', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.sender?.name ?? '?'}</span>
                </div>
                {/* Receiver */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#334155', fontSize: 14 }}>→</span>
                  <MiniAvatar name={tx.receiver?.name ?? '?'} avatar_url={tx.receiver?.avatar_url} />
                  <span style={{ color: '#F8FAFC', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.receiver?.name ?? '?'}</span>
                </div>
                {/* Gift */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{tx.sticker?.icon}</span>
                  <span style={{ color: '#64748B', fontSize: 12 }}>{tx.sticker?.name}</span>
                </div>
                {/* Credits */}
                <span style={{ color: '#D4A853', fontSize: 13, fontWeight: 700, fontFamily: 'Fira Code, monospace' }}>−{tx.sticker?.price_credits ?? 0}</span>
                {/* Date */}
                <span style={{ color: '#475569', fontSize: 12 }}>
                  {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
