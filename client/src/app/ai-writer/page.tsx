'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, RefreshCw, Sparkles, Coins, ChevronDown } from 'lucide-react';

const TYPES = [
  {
    id: 'pickup_line',
    label: 'Pick-up Lines',
    emoji: '🎯',
    desc: 'Three clever, charming openers',
    gradient: 'linear-gradient(135deg, #f97316, #eab308)',
    color: '#f97316',
  },
  {
    id: 'poem',
    label: 'Poem',
    emoji: '🌹',
    desc: 'A short romantic poem (8-12 lines)',
    gradient: 'linear-gradient(135deg, #E8604C, #a855f7)',
    color: '#E8604C',
  },
  {
    id: 'love_letter',
    label: 'Love Letter',
    emoji: '💌',
    desc: 'A heartfelt 2-3 paragraph letter',
    gradient: 'linear-gradient(135deg, #ec4899, #E8604C)',
    color: '#ec4899',
  },
];

const STYLES = [
  { id: 'Romantic and heartfelt', label: '💞 Romantic' },
  { id: 'Funny and playful', label: '😄 Funny' },
  { id: 'Mysterious and poetic', label: '🌙 Mysterious' },
  { id: 'Sweet and gentle', label: '🌸 Sweet' },
  { id: 'Bold and confident', label: '🔥 Bold' },
];

type Match = { matchId: string; user: { id: string; name: string; avatar_url?: string; interests?: string[] } };

export default function AIWriterPage() {
  const { user, token, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [selectedType, setSelectedType] = useState(TYPES[0]);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchOpen, setMatchOpen] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!token) return;
    api<{ matches: Match[] }>('/api/matches', { token })
      .then(d => setMatches(d.matches || []))
      .catch(() => {});
  }, [token]);

  const generate = async () => {
    if (!token) return;
    setGenerating(true);
    setResult('');
    setError('');
    try {
      const data = await api<{ content: string; remaining_credits: number }>(
        '/api/ai-writer',
        {
          method: 'POST',
          token,
          body: {
            type: selectedType.id,
            style: selectedStyle.id,
            targetUserId: selectedMatch?.user?.id || undefined,
          },
        }
      );
      setResult(data.content);
      await refreshUser(); // update credit display
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 spinner" /></div>;
  if (!user) return null;

  return (
    <div className="mesh-bg min-h-screen pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6 relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #E8604C22, #a855f722)', border: '1px solid rgba(232,96,76,0.3)' }}>
              ✨
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                AI Creative Writer
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Generate romantic content with AI · 5 credits each</p>
            </div>
          </div>

          {/* Credits pill */}
          <div className="flex justify-end">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
              <Coins className="w-3.5 h-3.5" />
              {user.credits ?? 0} credits available
            </div>
          </div>
        </motion.div>

        {/* Type selector */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 20, padding: '20px' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Choose type</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TYPES.map(t => (
              <button key={t.id} onClick={() => setSelectedType(t)}
                className="flex sm:flex-col items-center gap-3 sm:gap-2 p-4 rounded-2xl transition-all cursor-pointer text-left sm:text-center"
                style={{
                  border: `2px solid ${selectedType.id === t.id ? t.color : 'var(--border-subtle)'}`,
                  background: selectedType.id === t.id ? `${t.color}12` : 'var(--bg-elevated)',
                  boxShadow: selectedType.id === t.id ? `0 0 0 4px ${t.color}18` : 'none',
                }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{t.emoji}</span>
                <div className="flex-1 sm:text-center">
                  <p className="text-xs font-bold" style={{ color: selectedType.id === t.id ? t.color : 'var(--text-secondary)' }}>{t.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)', lineHeight: 1.3 }}>{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Style + Recipient */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 20, padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Style */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Tone / Style</p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map(s => (
                <button key={s.id} onClick={() => setSelectedStyle(s)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
                  style={{
                    background: selectedStyle.id === s.id ? 'var(--color-brand-subtle)' : 'var(--bg-elevated)',
                    border: `1.5px solid ${selectedStyle.id === s.id ? 'var(--color-brand)' : 'var(--border-subtle)'}`,
                    color: selectedStyle.id === s.id ? 'var(--color-brand)' : 'var(--text-secondary)',
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient dropdown */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              Personalize for (optional)
            </p>
            <div className="relative">
              <button onClick={() => setMatchOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors cursor-pointer"
                style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <div className="flex items-center gap-2.5">
                  {selectedMatch ? (
                    <>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: 'var(--color-brand)' }}>
                        {selectedMatch.user.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedMatch.user.name}</span>
                    </>
                  ) : (
                    <span className="text-sm">No recipient — generate generic</span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${matchOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {matchOpen && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xl)', zIndex: 50, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                    <button onClick={() => { setSelectedMatch(null); setMatchOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer"
                      style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                      ✦ No recipient (generic)
                    </button>
                    {matches.length === 0 && (
                      <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>No matches yet. Connect with someone first!</p>
                    )}
                    {matches.map(m => (
                      <button key={m.matchId} onClick={() => { setSelectedMatch(m); setMatchOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-colors cursor-pointer"
                        style={{ color: selectedMatch?.matchId === m.matchId ? 'var(--color-brand)' : 'var(--text-primary)', background: selectedMatch?.matchId === m.matchId ? 'var(--color-brand-subtle)' : 'transparent' }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: 'var(--color-brand)' }}>
                          {m.user.name.charAt(0)}
                        </div>
                        {m.user.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Generate button */}
        <motion.button
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          onClick={generate}
          disabled={generating || (user.credits ?? 0) < 5}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-white font-bold text-base cursor-pointer"
          style={{
            background: (user.credits ?? 0) < 5 ? 'var(--bg-elevated)' : selectedType.gradient,
            color: (user.credits ?? 0) < 5 ? 'var(--text-muted)' : 'white',
            boxShadow: (user.credits ?? 0) >= 5 ? `0 8px 32px ${selectedType.color}40` : 'none',
            opacity: generating ? 0.8 : 1,
          }}>
          {generating ? (
            <><RefreshCw className="w-5 h-5 animate-spin" /> Generating…</>
          ) : (
            <><Sparkles className="w-5 h-5" /> Generate {selectedType.label}
              <span className="text-xs font-semibold opacity-75 ml-1">· 5 credits</span>
            </>
          )}
        </motion.button>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 rounded-2xl text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
            {error}
          </motion.div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16 }}
              style={{ background: 'var(--bg-card)', border: `1.5px solid ${selectedType.color}40`, borderRadius: 20, overflow: 'hidden' }}>

              {/* Result header */}
              <div className="px-5 py-4 flex items-center justify-between"
                style={{ background: `linear-gradient(135deg, ${selectedType.color}10, transparent)`, borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 20 }}>{selectedType.emoji}</span>
                  <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {selectedType.label}
                    {selectedMatch && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> for {selectedMatch.user.name}</span>}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={copy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    style={{ background: copied ? 'rgba(34,197,94,0.1)' : 'var(--bg-elevated)', color: copied ? '#22c55e' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                  <button onClick={generate} disabled={generating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} /> Regenerate
                  </button>
                </div>
              </div>

              {/* Result content */}
              <div className="p-6">
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)', fontStyle: selectedType.id === 'poem' ? 'italic' : 'normal', lineHeight: 1.8 }}>
                  {result}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
