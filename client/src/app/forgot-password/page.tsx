'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Loader2, AlertCircle, Mail, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

function validateEmail(v: string) {
  if (!v) return 'Email address is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
  return '';
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const err = validateEmail(email);
    setFieldError(err);
    setTouched(true);
    if (err) return;

    setLoading(true);
    try {
      await api<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() },
      });
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

        {/* Logo */}
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

        {/* Illustration text */}
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Locked Out?<br />We&apos;ve Got You.
          </h2>
          <p className="text-white/75 text-base">
            It happens to everyone. Enter your email and we&apos;ll send you a secure link to reset your password — no fuss.
          </p>
        </div>

        <div className="relative z-10 border-t border-white/20 pt-6">
          <p className="text-white/55 text-xs font-medium">
            The reset link expires after 60 minutes for your security.
          </p>
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

          <AnimatePresence mode="wait">

            {/* ── Success State ─────────────────────────── */}
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'rgba(42, 181, 126, 0.1)' }}>
                  <CheckCircle2 className="w-10 h-10" style={{ color: '#2AB57E' }} />
                </div>
                <h1 className="text-2xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>
                  Check your email
                </h1>
                <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>
                  If <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{email}</span> is
                  linked to a SoulSync account, you&apos;ll receive a password reset link shortly.
                </p>
                <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>
                  Didn&apos;t receive it? Check your spam folder, or{' '}
                  <button
                    onClick={() => setSent(false)}
                    className="font-semibold hover:underline cursor-pointer"
                    style={{ color: 'var(--color-brand)' }}
                  >
                    try again
                  </button>
                  .
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 btn-primary px-6 py-3 text-sm font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </Link>
              </motion.div>
            ) : (

              /* ── Request Form ─────────────────────────── */
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-8">
                  <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Forgot password?
                  </h1>
                  <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                    Enter your email and we&apos;ll send you a reset link.
                  </p>
                </div>

                {/* Global error */}
                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-5 p-3.5 rounded-xl flex items-start gap-2.5 text-sm"
                    style={{ background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', color: 'var(--color-error)' }}>
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="forgot-email" className="block text-xs font-semibold mb-2"
                      style={{ color: 'var(--text-secondary)' }}>
                      Email address
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: touched && fieldError ? 'var(--color-error)' : 'var(--text-muted)' }}
                      />
                      <input
                        id="forgot-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (touched) setFieldError(validateEmail(e.target.value));
                        }}
                        onBlur={() => { setTouched(true); setFieldError(validateEmail(email)); }}
                        placeholder="you@example.com"
                        className={`input-field pl-10 ${touched && fieldError ? 'border-red-400 focus:!shadow-[0_0_0_3px_rgba(224,82,82,0.12)]' : ''}`}
                        aria-invalid={!!(touched && fieldError)}
                        aria-describedby={touched && fieldError ? 'email-error' : undefined}
                      />
                    </div>
                    {touched && fieldError && (
                      <motion.p id="email-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-1.5 text-xs flex items-center gap-1" style={{ color: 'var(--color-error)' }}>
                        <AlertCircle className="w-3 h-3 shrink-0" /> {fieldError}
                      </motion.p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2 mt-2"
                  >
                    {loading
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
                      : 'Send Reset Link'
                    }
                  </button>
                </form>

                <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
                  Remember your password?{' '}
                  <Link href="/login" className="font-semibold hover:underline" style={{ color: 'var(--color-brand)' }}>
                    Sign in
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
