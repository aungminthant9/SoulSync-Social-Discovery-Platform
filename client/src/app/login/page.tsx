'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Heart, Loader2, AlertCircle, Mail, Lock, Eye, EyeOff,
  Sparkles, Check, ShieldAlert,
} from 'lucide-react';

const PERKS = [
  'AI-powered compatibility matching',
  'Real-time chat with your connections',
  'Private & safe — you control who sees you',
];

// ── Validation helpers ──────────────────────────────────────────
function validateEmail(v: string) {
  if (!v) return 'Email address is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
  return '';
}
function validatePassword(v: string) {
  if (!v) return 'Password is required.';
  if (v.length < 6) return 'Password must be at least 6 characters.';
  return '';
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Field-level validation errors (only shown after blur or submit attempt)
  const [touched, setTouched] = useState({ email: false, password: false });
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });

  const touch = (field: 'email' | 'password') => {
    setTouched((t) => ({ ...t, [field]: true }));
    if (field === 'email') setFieldErrors((e) => ({ ...e, email: validateEmail(email) }));
    if (field === 'password') setFieldErrors((e) => ({ ...e, password: validatePassword(password) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Run all validations
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setFieldErrors({ email: emailErr, password: passwordErr });
    setTouched({ email: true, password: true });
    if (emailErr || passwordErr) return;

    setLoading(true);
    try {
      await login(email, password);
      router.push('/discover');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: 'email' | 'password') =>
    `input-field pl-10 ${field === 'password' ? 'pr-11' : ''} ${touched[field] && fieldErrors[field] ? 'border-red-400 focus:!shadow-[0_0_0_3px_rgba(224,82,82,0.12)]' : ''}`;

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-page)' }}>

      {/* ── Left brand panel (desktop only) ────────────────── */}
      <div
        className="hidden lg:flex lg:w-[46%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, var(--color-brand) 0%, #C94A38 55%, #D4A853 100%)',
        }}
      >
        {/* Decorative blobs */}
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

        {/* Headline */}
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Where Meaningful<br />Connections Begin
          </h2>
          <p className="text-white/75 text-base mb-8">
            Join thousands of people building real relationships through AI-powered discovery.
          </p>

          {/* Perks */}
          <div className="space-y-3">
            {PERKS.map((p) => (
              <div key={p} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm text-white/85">{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10 border-t border-white/20 pt-6">
          <p className="text-white/80 text-sm italic">
            &ldquo;Found my best friend here in just two weeks. The AI icebreakers actually work!&rdquo;
          </p>
          <p className="text-white/55 text-xs mt-2 font-medium">— Aung Kyaw, Yangon</p>
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────── */}
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

          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Sign in to continue your journey
            </p>
          </div>

          {/* Global Error */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-xl flex items-start gap-2.5 text-sm"
              style={{ background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', color: 'var(--color-error)' }}>
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: touched.email && fieldErrors.email ? 'var(--color-error)' : 'var(--text-muted)' }} />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) setFieldErrors((fe) => ({ ...fe, email: validateEmail(e.target.value) }));
                  }}
                  onBlur={() => touch('email')}
                  placeholder="you@example.com"
                  className={inputClass('email')}
                  aria-invalid={!!(touched.email && fieldErrors.email)}
                  aria-describedby={touched.email && fieldErrors.email ? 'email-error' : undefined}
                />
              </div>
              {touched.email && fieldErrors.email && (
                <motion.p id="email-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs flex items-center gap-1" style={{ color: 'var(--color-error)' }}>
                  <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors.email}
                </motion.p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="login-password" className="block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium transition-colors hover:underline"
                  style={{ color: 'var(--color-brand)' }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: touched.password && fieldErrors.password ? 'var(--color-error)' : 'var(--text-muted)' }} />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) setFieldErrors((fe) => ({ ...fe, password: validatePassword(e.target.value) }));
                  }}
                  onBlur={() => touch('password')}
                  placeholder="••••••••"
                  className={inputClass('password')}
                  aria-invalid={!!(touched.password && fieldErrors.password)}
                  aria-describedby={touched.password && fieldErrors.password ? 'password-error' : undefined}
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.password && fieldErrors.password && (
                <motion.p id="password-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs flex items-center gap-1" style={{ color: 'var(--color-error)' }}>
                  <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors.password}
                </motion.p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2 mt-6"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold hover:underline"
              style={{ color: 'var(--color-brand)' }}>
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
