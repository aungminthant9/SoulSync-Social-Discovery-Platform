'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function DeleteAccountSection({ token }: { token: string }) {
  const { logout } = useAuth();
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const CONFIRM_PHRASE = 'DELETE MY ACCOUNT';

  const handleDelete = async () => {
    if (confirm !== CONFIRM_PHRASE) return;
    setError('');
    setDeleting(true);
    try {
      await api('/api/users/me', { method: 'DELETE', token });
      logout();
      router.push('/register');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <>
      {/* ── Danger Zone card ─────────────────────────────── */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'rgba(224,82,82,0.1)', color: 'var(--color-error)' }}>
          <Trash2 className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Delete Account
          </p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Permanently removes your profile, photos, matches, and all data. This action cannot be undone.
          </p>
          <button
            onClick={() => { setShowModal(true); setConfirm(''); setError(''); }}
            className="mt-3 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 hover:opacity-90"
            style={{ background: 'rgba(224,82,82,0.1)', color: 'var(--color-error)', border: '1px solid rgba(224,82,82,0.25)' }}>
            Delete my account
          </button>
        </div>
      </div>

      {/* ── Confirmation Modal ────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !deleting && setShowModal(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            />
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="w-full max-w-md rounded-2xl p-6 pointer-events-auto relative"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}>

                {/* Close */}
                {!deleting && (
                  <button onClick={() => setShowModal(false)}
                    className="absolute top-4 right-4 cursor-pointer rounded-lg p-1.5 transition-colors hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}>
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(224,82,82,0.1)' }}>
                  <AlertTriangle className="w-7 h-7" style={{ color: 'var(--color-error)' }} />
                </div>

                <h3 className="text-lg font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                  Delete your account?
                </h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-muted)' }}>
                  This will permanently erase your profile, photos, chat history, matches, and credits.
                  <strong style={{ color: 'var(--text-primary)' }}> There is no recovery.</strong>
                </p>

                {error && (
                  <div className="mb-4 p-3 rounded-xl text-sm flex items-start gap-2"
                    style={{ background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', color: 'var(--color-error)' }}>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
                  </div>
                )}

                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Type <span className="font-mono font-bold" style={{ color: 'var(--color-error)' }}>{CONFIRM_PHRASE}</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={CONFIRM_PHRASE}
                  disabled={deleting}
                  className="input-field mb-4 font-mono text-sm"
                  autoComplete="off"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={deleting}
                    className="flex-1 btn-secondary py-2.5 text-sm font-semibold">
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={confirm !== CONFIRM_PHRASE || deleting}
                    className="flex-1 py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'var(--color-error)', color: '#fff' }}>
                    {deleting
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</>
                      : <><Trash2 className="w-4 h-4" />Delete Forever</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
