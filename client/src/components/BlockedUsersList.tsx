'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldOff, Loader2, UserX, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

type BlockedUser = {
  blocked_id: string;
  created_at: string;
  blocked: { id: string; name: string; avatar_url: string | null };
};

export default function BlockedUsersList({ token }: { token: string }) {
  const [blocks, setBlocks] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ blocks: BlockedUser[] }>('/api/blocks', { token });
      setBlocks(data.blocks);
    } catch {
      showToast('error', 'Failed to load blocked users.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  const handleUnblock = async (blockedId: string, name: string) => {
    setUnblocking(blockedId);
    try {
      await api(`/api/blocks/${blockedId}`, { method: 'DELETE', token });
      setBlocks((prev) => prev.filter((b) => b.blocked_id !== blockedId));
      showToast('success', `${name} has been unblocked.`);
    } catch {
      showToast('error', 'Failed to unblock. Please try again.');
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(212,168,83,0.12)', color: '#D4A853' }}>
          <ShieldOff className="w-4 h-4" />
        </div>
        <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Blocked Users
        </h2>
        {!loading && blocks.length > 0 && (
          <span className="ml-auto text-xs font-semibold rounded-full px-2.5 py-1"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            {blocks.length}
          </span>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 p-3 rounded-xl flex items-center gap-2.5 text-sm"
            style={{
              background: toast.type === 'success' ? 'rgba(42,181,126,0.08)' : 'rgba(224,82,82,0.08)',
              border: `1px solid ${toast.type === 'success' ? 'rgba(42,181,126,0.2)' : 'rgba(224,82,82,0.2)'}`,
              color: toast.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
            }}>
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : blocks.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg-elevated)' }}>
            <UserX className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            You haven&apos;t blocked anyone
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {blocks.map((b) => {
              const u = b.blocked;
              const hue = u.name ? u.name.charCodeAt(0) * 137 : 0;
              const grad = `linear-gradient(135deg,hsl(${hue % 360},65%,52%),hsl(${(hue + 55) % 360},70%,42%))`;
              return (
                <motion.li key={b.blocked_id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  {/* Avatar */}
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.name}
                      className="w-10 h-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: grad }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {u.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Blocked {new Date(b.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnblock(b.blocked_id, u.name)}
                    disabled={unblocking === b.blocked_id}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 hover:opacity-80 disabled:opacity-50"
                    style={{ background: 'rgba(212,168,83,0.12)', color: '#D4A853', border: '1px solid rgba(212,168,83,0.25)' }}>
                    {unblocking === b.blocked_id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : 'Unblock'}
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
