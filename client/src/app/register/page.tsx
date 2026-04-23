'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Loader2, AlertCircle, Mail, Lock, Eye, EyeOff,
  User, MapPin, Calendar, Venus, ArrowRight, ArrowLeft, Sparkles, Check,
} from 'lucide-react';

const STEPS = ['Account', 'Personal'];

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    dob: '', gender: '', city: '', country: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const calculateAge = (dob: string) => {
    const b = new Date(dob), t = new Date();
    let a = t.getFullYear() - b.getFullYear();
    if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
    return a;
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.dob) return setError('Date of birth is required.');
    if (calculateAge(form.dob) < 18) return setError('You must be at least 18 years old to join SoulSync.');
    if (!form.gender) return setError('Please select your gender.');
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password, dob: form.dob, gender: form.gender, city: form.city, country: form.country });
      router.push('/profile');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-page)' }}>

      {/* ── Left brand panel ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #C94A38 0%, var(--color-brand) 50%, #D4A853 100%)' }}>
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'white', filter: 'blur(60px)' }} />
        <div className="absolute top-0 left-0 w-60 h-60 rounded-full opacity-10"
          style={{ background: 'white', filter: 'blur(50px)' }} />

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
            Your Story <br />Starts Here
          </h2>
          <p className="text-white/75 text-base mb-8">
            Create your free profile in under 2 minutes and start discovering meaningful connections today.
          </p>
          <div className="space-y-3">
            {['Free to join — no credit card needed', 'AI matches you by real compatibility', 'Your data stays private and secure'].map((p) => (
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

        {/* Step indicators */}
        <div className="relative z-10 border-t border-white/20 pt-6">
          <p className="text-white/55 text-xs font-medium uppercase tracking-wider mb-3">Registration progress</p>
          <div className="flex gap-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= step ? 'bg-white text-red-500' : 'border border-white/30 text-white/50'}`}>
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={`text-sm font-medium ${i <= step ? 'text-white' : 'text-white/50'}`}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-brand)' }}>
              <Heart className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>SoulSync</span>
          </div>

          {/* Progress bar (mobile) */}
          <div className="lg:hidden mb-6">
            <div className="flex justify-between text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              <span>Step {step + 1} of {STEPS.length}</span>
              <span>{STEPS[step]}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
              <motion.div className="h-full rounded-full" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                style={{ background: 'var(--color-brand)' }} transition={{ duration: 0.35 }} />
            </div>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {step === 0 ? 'Create your account' : 'About yourself'}
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              {step === 0 ? 'Start with your basic account details.' : 'Help others know who you are.'}
            </p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-5 p-3.5 rounded-xl flex items-start gap-2.5 text-sm"
                style={{ background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', color: 'var(--color-error)' }}>
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* ── Step 1: Account ───────────────────────────── */}
            {step === 0 && (
              <motion.form key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                onSubmit={handleStep1} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    <input name="name" type="text" required value={form.name} onChange={(e) => set('name', e.target.value)}
                      placeholder="Your full name" className="input-field pl-10" />
                  </div>
                </div>
                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    <input name="email" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)}
                      placeholder="you@example.com" className="input-field pl-10" />
                  </div>
                </div>
                {/* Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                      <input name="password" type={showPw ? 'text' : 'password'} required value={form.password}
                        onChange={(e) => set('password', e.target.value)} placeholder="••••••••" className="input-field pl-10 pr-9" />
                      <button type="button" tabIndex={-1} onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                        {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Confirm</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                      <input name="confirmPassword" type={showCpw ? 'text' : 'password'} required value={form.confirmPassword}
                        onChange={(e) => set('confirmPassword', e.target.value)} placeholder="••••••••" className="input-field pl-10 pr-9" />
                      <button type="button" tabIndex={-1} onClick={() => setShowCpw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                        {showCpw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full btn-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2 mt-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.form>
            )}

            {/* ── Step 2: Personal ──────────────────────────── */}
            {step === 1 && (
              <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                onSubmit={handleSubmit} className="space-y-4">
                {/* DOB + Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Date of Birth</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                      <input name="dob" type="date" required value={form.dob}
                        onChange={(e) => set('dob', e.target.value)} className="input-field pl-10" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Gender</label>
                    <div className="relative">
                      <Venus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                      <select name="gender" required value={form.gender} onChange={(e) => set('gender', e.target.value)}
                        className="input-field pl-10">
                        <option value="">Select…</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
                {/* City + Country */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>City <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                      <input name="city" type="text" value={form.city} onChange={(e) => set('city', e.target.value)}
                        placeholder="e.g. Yangon" className="input-field pl-10" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Country <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                      <input name="country" type="text" value={form.country} onChange={(e) => set('country', e.target.value)}
                        placeholder="e.g. Myanmar" className="input-field pl-10" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => { setStep(0); setError(''); }}
                    className="btn-secondary flex items-center gap-1.5 px-5 py-3.5 text-sm font-semibold">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 btn-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : <>Create Account <Check className="w-4 h-4" /></>}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: 'var(--color-brand)' }}>
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
