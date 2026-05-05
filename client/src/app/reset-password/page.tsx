'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Heart, Loader2, AlertCircle, Lock, Eye, EyeOff,
  CheckCircle2, Sparkles, ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';

// Password strength indicator
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#E05252', '#D4A853', '#2AB57E', '#2AB57E'];

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: score >= i ? colors[score] : 'var(--bg-elevated)' }} />
        ))}
      </div>
      <p className="text-xs" style={{ color: score >= 3 ? '#2AB57E' : score >= 2 ? '#D4A853' : '#E05252' }}>
        {labels[score] || ''}
      </p>
    </div>
  );
}

function validatePassword(v: string) {
  if (!v) return 'Password is required.';
  if (v.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(v)) return 'Include at least one uppercase letter.';
  if (!/[0-9]/.test(v)) return 'Include at least one number.';
  return '';
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Supabase appends #access_token=... to the URL — we parse it from hash
  const [accessToken, setAccessToken] = useState('');
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [fieldErrors, setFieldErrors] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Extract access_token from URL hash (Supabase uses hash params)
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token') || searchParams.get('access_token') || '';
    const type = params.get('type') || searchParams.get('type') || '';

    if (!token) {
      setTokenError('No reset token found. Please request a new password reset link.');
    } else if (type && type !== 'recovery') {
      setTokenError('This link is not a password reset link. Please request a new one.');
    } else {
      setAccessToken(token);
    }
  }, [searchParams]);

  const touchField = (field: 'password' | 'confirm') => {
    setTouched((t) => ({ ...t, [field]: true }));
    if (field === 'password') setFieldErrors((e) => ({ ...e, password: validatePassword(password) }));
    if (field === 'confirm') setFieldErrors((e) => ({ ...e, confirm: confirm !== password ? 'Passwords do not match.' : '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pwErr = validatePassword(password);
    const confirmErr = confirm !== password ? 'Passwords do not match.' : '';
    setFieldErrors({ password: pwErr, confirm: confirmErr });
    setTouched({ password: true, confirm: true });
    if (pwErr || confirmErr) return;

    setLoading(true);
    try {
      await api<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: { access_token: accessToken, password },
      });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = (field: 'password' | 'confirm') =>
    `input-field pl-10 pr-11 ${touched[field] && fieldErrors[field] ? 'border-red-400 focus:!shadow-[0_0_0_3px_rgba(224,82,82,0.12)]' : ''}`;

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-page)' }}>

      {/* ── Left brand panel ────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[46%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, var(--color-brand) 0%, #C94A38 55%, #D4A853 100%)' }}
      >
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-20"
          style={{ background: 'white', filter: 'blur(50px)' }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'white', filter: 'blur(60px)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Heart className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">SoulSync</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-white/70" />
            <span className="text-[11px] text-white/70 font-medium">AI-Enhanced Social Discovery</span>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Create a New<br />Strong Password
          </h2>
          <p className="text-white/75 text-base">
            Choose a password that&apos;s unique and hard to guess. We recommend using a mix of letters, numbers, and symbols.
          </p>
        </div>

        <div className="relative z-10 border-t border-white/20 pt-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-white/70" />
            <p className="text-white/55 text-xs font-medium">Your password is encrypted and never stored in plain text.</p>
          </div>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-brand)' }}>
              <Heart className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>SoulSync</span>
          </div>

          {/* ── Invalid / missing token ── */}
          {tokenError && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(224,82,82,0.1)' }}>
                <AlertCircle className="w-8 h-8" style={{ color: 'var(--color-error)' }} />
              </div>
              <h1 className="text-2xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>Invalid Link</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{tokenError}</p>
              <Link href="/forgot-password" className="btn-primary px-6 py-3 text-sm font-bold inline-flex">
                Request New Link
              </Link>
            </div>
          )}

          {/* ── Success ── */}
          {!tokenError && success && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(42,181,126,0.1)' }}>
                <CheckCircle2 className="w-10 h-10" style={{ color: '#2AB57E' }} />
              </div>
              <h1 className="text-2xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>
                Password Updated!
              </h1>
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                Your password has been reset successfully.
              </p>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                Redirecting you to sign in…
              </p>
              <Link href="/login" className="btn-primary px-6 py-3 text-sm font-bold inline-flex">
                Sign In Now
              </Link>
            </motion.div>
          )}

          {/* ── Form ── */}
          {!tokenError && !success && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Reset password
                </h1>
                <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Choose a strong new password for your account.
                </p>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-5 p-3.5 rounded-xl flex items-start gap-2.5 text-sm"
                  style={{ background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', color: 'var(--color-error)' }}>
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* New Password */}
                <div>
                  <label htmlFor="reset-password" className="block text-xs font-semibold mb-2"
                    style={{ color: 'var(--text-secondary)' }}>
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: touched.password && fieldErrors.password ? 'var(--color-error)' : 'var(--text-muted)' }} />
                    <input
                      id="reset-password"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (touched.password) setFieldErrors((fe) => ({ ...fe, password: validatePassword(e.target.value) }));
                      }}
                      onBlur={() => touchField('password')}
                      placeholder="••••••••"
                      className={fieldClass('password')}
                      aria-invalid={!!(touched.password && fieldErrors.password)}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {touched.password && fieldErrors.password && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-1.5 text-xs flex items-center gap-1" style={{ color: 'var(--color-error)' }}>
                      <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors.password}
                    </motion.p>
                  )}
                  <PasswordStrength password={password} />
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="reset-confirm" className="block text-xs font-semibold mb-2"
                    style={{ color: 'var(--text-secondary)' }}>
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: touched.confirm && fieldErrors.confirm ? 'var(--color-error)' : 'var(--text-muted)' }} />
                    <input
                      id="reset-confirm"
                      type={showCpw ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => {
                        setConfirm(e.target.value);
                        if (touched.confirm) setFieldErrors((fe) => ({ ...fe, confirm: e.target.value !== password ? 'Passwords do not match.' : '' }));
                      }}
                      onBlur={() => touchField('confirm')}
                      placeholder="••••••••"
                      className={fieldClass('confirm')}
                      aria-invalid={!!(touched.confirm && fieldErrors.confirm)}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowCpw((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}>
                      {showCpw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {touched.confirm && fieldErrors.confirm && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-1.5 text-xs flex items-center gap-1" style={{ color: 'var(--color-error)' }}>
                      <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors.confirm}
                    </motion.p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2 mt-2"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Updating…</>
                    : 'Update Password'
                  }
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-brand)' }} />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
