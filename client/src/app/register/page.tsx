'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Loader2, AlertCircle, Mail, Lock, Eye, EyeOff,
  User, MapPin, Calendar, Venus, ArrowRight, ArrowLeft, Sparkles, Check,
  ChevronDown, Search,
} from 'lucide-react';
import { Country, City } from 'country-state-city';

const STEPS = ['Account', 'Personal'];

// ── Location Select ─────────────────────────────────────────────────────────
function LocationSelect({
  id,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  placeholder: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Auto-focus search box when opening
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  return (
    <div ref={wrapperRef} className="relative" id={id}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen((v) => !v); }}
        className="input-field w-full pl-10 pr-9 text-left flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={open ? { borderColor: 'var(--color-brand)', boxShadow: '0 0 0 3px rgba(232,96,76,0.12)' } : {}}
      >
        <MapPin
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--text-muted)' }}
        />
        <span className="flex-1 truncate" style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-transform duration-200"
          style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-50 mt-1.5 w-full rounded-xl overflow-hidden"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            {/* Search box */}
            <div className="p-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-lg outline-none"
                  style={{
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                  }}
                />
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No results</p>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors duration-100 cursor-pointer flex items-center gap-2"
                    style={{
                      background: value === opt.value ? 'var(--color-brand-subtle)' : 'transparent',
                      color: value === opt.value ? 'var(--color-brand)' : 'var(--text-primary)',
                      fontWeight: value === opt.value ? 600 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (value !== opt.value)
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)';
                    }}
                    onMouseLeave={(e) => {
                      if (value !== opt.value)
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }}
                  >
                    {value === opt.value && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-brand)' }} />}
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Validators ─────────────────────────────────────────────────
const validators = {
  name: (v: string) => {
    if (!v.trim()) return 'Full name is required.';
    if (v.trim().length < 2) return 'Name must be at least 2 characters.';
    return '';
  },
  email: (v: string) => {
    if (!v) return 'Email address is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
    return '';
  },
  password: (v: string) => {
    if (!v) return 'Password is required.';
    if (v.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(v)) return 'Include at least one uppercase letter.';
    if (!/[0-9]/.test(v)) return 'Include at least one number.';
    return '';
  },
  confirmPassword: (v: string, pw: string) => {
    if (!v) return 'Please confirm your password.';
    if (v !== pw) return 'Passwords do not match.';
    return '';
  },
  dob: (v: string) => {
    if (!v) return 'Date of birth is required.';
    const b = new Date(v), t = new Date();
    let a = t.getFullYear() - b.getFullYear();
    if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
    if (a < 18) return 'You must be at least 18 years old to join SoulSync.';
    if (a > 120) return 'Please enter a valid date of birth.';
    return '';
  },
  gender: (v: string) => (!v ? 'Please select your gender.' : ''),
};

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
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: score >= i ? colors[score] : 'var(--bg-elevated)' }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color: score >= 3 ? '#2AB57E' : score >= 2 ? '#D4A853' : '#E05252' }}>
        {labels[score] || ''}
      </p>
    </div>
  );
}

type FormFields = {
  name: string; email: string; password: string; confirmPassword: string;
  dob: string; gender: string; city: string; country: string;
};
type Step1Fields = keyof Pick<FormFields, 'name' | 'email' | 'password' | 'confirmPassword'>;
type Step2Fields = keyof Pick<FormFields, 'dob' | 'gender'>;

// Memoised option lists from country-state-city
const ALL_COUNTRIES = Country.getAllCountries().map((c) => ({
  value: c.isoCode,
  label: c.name,
}));

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormFields>({
    name: '', email: '', password: '', confirmPassword: '',
    dob: '', gender: '', city: '', country: '',
  });
  // Store ISO code for country lookup; the human-readable name is stored in form.country
  const [countryIso, setCountryIso] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Per-field touched state
  const [touched, setTouched] = useState<Partial<Record<keyof FormFields, boolean>>>({});
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormFields, string>>>({});

  const set = (k: keyof FormFields, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (touched[k]) {
      // Re-validate on change if already touched
      let err = '';
      if (k === 'name') err = validators.name(v);
      else if (k === 'email') err = validators.email(v);
      else if (k === 'password') err = validators.password(v);
      else if (k === 'confirmPassword') err = validators.confirmPassword(v, form.password);
      else if (k === 'dob') err = validators.dob(v);
      else if (k === 'gender') err = validators.gender(v);
      setFieldErrors((e) => ({ ...e, [k]: err }));
    }
  };

  const touch = useCallback((k: keyof FormFields) => {
    setTouched((t) => ({ ...t, [k]: true }));
    let err = '';
    const currentForm = { ...form };
    if (k === 'name') err = validators.name(currentForm.name);
    else if (k === 'email') err = validators.email(currentForm.email);
    else if (k === 'password') err = validators.password(currentForm.password);
    else if (k === 'confirmPassword') err = validators.confirmPassword(currentForm.confirmPassword, currentForm.password);
    else if (k === 'dob') err = validators.dob(currentForm.dob);
    else if (k === 'gender') err = validators.gender(currentForm.gender);
    setFieldErrors((e) => ({ ...e, [k]: err }));
  }, [form]);

  const fieldClass = (k: keyof FormFields, extra = '') =>
    `input-field ${extra} ${touched[k] && fieldErrors[k] ? 'border-red-400 focus:!shadow-[0_0_0_3px_rgba(224,82,82,0.12)]' : ''}`;

  const FieldError = ({ field }: { field: keyof FormFields }) =>
    touched[field] && fieldErrors[field] ? (
      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
        className="mt-1.5 text-xs flex items-center gap-1" style={{ color: 'var(--color-error)' }}>
        <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors[field]}
      </motion.p>
    ) : null;

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const step1Fields: Step1Fields[] = ['name', 'email', 'password', 'confirmPassword'];
    const errs: Partial<Record<keyof FormFields, string>> = {};
    errs.name = validators.name(form.name);
    errs.email = validators.email(form.email);
    errs.password = validators.password(form.password);
    errs.confirmPassword = validators.confirmPassword(form.confirmPassword, form.password);
    setFieldErrors(errs);
    setTouched(Object.fromEntries(step1Fields.map((k) => [k, true])));
    const hasError = step1Fields.some((k) => errs[k]);
    if (hasError) return;
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const step2Fields: Step2Fields[] = ['dob', 'gender'];
    const errs: Partial<Record<keyof FormFields, string>> = { ...fieldErrors };
    errs.dob = validators.dob(form.dob);
    errs.gender = validators.gender(form.gender);
    setFieldErrors(errs);
    setTouched((t) => ({ ...t, dob: true, gender: true }));
    if (errs.dob || errs.gender) return;

    setLoading(true);
    try {
      await register({
        name: form.name, email: form.email, password: form.password,
        dob: form.dob, gender: form.gender, city: form.city, country: form.country,
      });
      router.push('/profile');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
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

          {/* Global Error */}
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
            {/* ── Step 1: Account ─────────────────────────── */}
            {step === 0 && (
              <motion.form key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                onSubmit={handleStep1} className="space-y-4" noValidate>

                {/* Name */}
                <div>
                  <label htmlFor="reg-name" className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: touched.name && fieldErrors.name ? 'var(--color-error)' : 'var(--text-muted)' }} />
                    <input id="reg-name" type="text" value={form.name}
                      onChange={(e) => set('name', e.target.value)} onBlur={() => touch('name')}
                      placeholder="Your full name" className={fieldClass('name', 'pl-10')}
                      aria-invalid={!!(touched.name && fieldErrors.name)} />
                  </div>
                  <FieldError field="name" />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="reg-email" className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: touched.email && fieldErrors.email ? 'var(--color-error)' : 'var(--text-muted)' }} />
                    <input id="reg-email" type="email" value={form.email}
                      onChange={(e) => set('email', e.target.value)} onBlur={() => touch('email')}
                      placeholder="you@example.com" className={fieldClass('email', 'pl-10')}
                      aria-invalid={!!(touched.email && fieldErrors.email)} />
                  </div>
                  <FieldError field="email" />
                </div>

                {/* Password grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-password" className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: touched.password && fieldErrors.password ? 'var(--color-error)' : 'var(--text-muted)' }} />
                      <input id="reg-password" type={showPw ? 'text' : 'password'} value={form.password}
                        onChange={(e) => set('password', e.target.value)} onBlur={() => touch('password')}
                        placeholder="••••••••" className={fieldClass('password', 'pl-10 pr-9')}
                        aria-invalid={!!(touched.password && fieldErrors.password)} />
                      <button type="button" tabIndex={-1} onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                        {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <FieldError field="password" />
                    <PasswordStrength password={form.password} />
                  </div>
                  <div>
                    <label htmlFor="reg-confirm" className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Confirm</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: touched.confirmPassword && fieldErrors.confirmPassword ? 'var(--color-error)' : 'var(--text-muted)' }} />
                      <input id="reg-confirm" type={showCpw ? 'text' : 'password'} value={form.confirmPassword}
                        onChange={(e) => set('confirmPassword', e.target.value)} onBlur={() => touch('confirmPassword')}
                        placeholder="••••••••" className={fieldClass('confirmPassword', 'pl-10 pr-9')}
                        aria-invalid={!!(touched.confirmPassword && fieldErrors.confirmPassword)} />
                      <button type="button" tabIndex={-1} onClick={() => setShowCpw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                        {showCpw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <FieldError field="confirmPassword" />
                  </div>
                </div>

                <button type="submit" className="w-full btn-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2 mt-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.form>
            )}

            {/* ── Step 2: Personal ─────────────────────────── */}
            {step === 1 && (
              <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                onSubmit={handleSubmit} className="space-y-4" noValidate>

                {/* DOB + Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-dob" className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Date of Birth</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: touched.dob && fieldErrors.dob ? 'var(--color-error)' : 'var(--text-muted)' }} />
                      <input id="reg-dob" type="date" value={form.dob}
                        onChange={(e) => set('dob', e.target.value)} onBlur={() => touch('dob')}
                        className={fieldClass('dob', 'pl-10')}
                        aria-invalid={!!(touched.dob && fieldErrors.dob)} />
                    </div>
                    <FieldError field="dob" />
                  </div>
                  <div>
                    <label htmlFor="reg-gender" className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Gender</label>
                    <div className="relative">
                      <Venus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: touched.gender && fieldErrors.gender ? 'var(--color-error)' : 'var(--text-muted)' }} />
                      <select id="reg-gender" value={form.gender}
                        onChange={(e) => set('gender', e.target.value)} onBlur={() => touch('gender')}
                        className={fieldClass('gender', 'pl-10')}
                        aria-invalid={!!(touched.gender && fieldErrors.gender)}>
                        <option value="">Select…</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <FieldError field="gender" />
                  </div>
                </div>

                {/* Country + City (searchable dropdowns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Country */}
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Country <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <LocationSelect
                      id="reg-country"
                      placeholder="Select country…"
                      options={ALL_COUNTRIES}
                      value={countryIso}
                      onChange={(iso) => {
                        const found = Country.getCountryByCode(iso);
                        setCountryIso(iso);
                        // Store human-readable name in form
                        set('country', found?.name ?? '');
                        // Reset city when country changes
                        set('city', '');
                      }}
                    />
                  </div>

                  {/* City – enabled only after a country is picked */}
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                      City <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <LocationSelect
                      id="reg-city"
                      placeholder={countryIso ? 'Select city…' : 'Pick country first'}
                      options={
                        countryIso
                          ? City.getCitiesOfCountry(countryIso)?.map((c) => ({
                              value: c.name,
                              label: c.name,
                            })) ?? []
                          : []
                      }
                      value={form.city}
                      onChange={(cityName) => set('city', cityName)}
                      disabled={!countryIso}
                    />
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
