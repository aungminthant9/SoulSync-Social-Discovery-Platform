'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import {
  Search,
  Palette,
  BrainCircuit,
  MessageCircle,
  Gift,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Heart,
  Users,
  Globe,
  Star,
  Check,
  Zap,
  UserCheck,
  MessagesSquare,
} from 'lucide-react';

// ── Fake floating avatar bubbles for hero visual ──────────────────────────────
const FLOATING_AVATARS = [
  { name: 'Aung', hue: 340, top: '12%', left: '6%', size: 52, delay: 0 },
  { name: 'Min', hue: 200, top: '60%', left: '3%', size: 44, delay: 0.4 },
  { name: 'Zin', hue: 160, top: '30%', right: '5%', size: 48, delay: 0.2 },
  { name: 'Su', hue: 45, top: '70%', right: '8%', size: 56, delay: 0.6 },
  { name: 'Kay', hue: 280, top: '80%', left: '10%', size: 40, delay: 0.8 },
  { name: 'Nay', hue: 20, top: '18%', right: '12%', size: 42, delay: 1.0 },
];

function FloatingAvatar({
  name, hue, size, delay, style,
}: { name: string; hue: number; size: number; delay: number; style?: React.CSSProperties }) {
  const bg = `hsl(${hue},65%,52%)`;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
      transition={{
        opacity: { delay, duration: 0.5 },
        scale: { delay, duration: 0.5 },
        y: { delay: delay + 0.5, duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
      }}
      className="absolute flex flex-col items-center gap-1 pointer-events-none select-none"
      style={style}
    >
      <div
        className="rounded-full flex items-center justify-center font-bold text-white shadow-lg"
        style={{ width: size, height: size, background: bg, fontSize: size * 0.38, boxShadow: `0 4px 20px ${bg}50` }}
      >
        {name.charAt(0)}
      </div>
      <span className="text-[10px] font-semibold rounded-full px-2 py-0.5"
        style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-sm)' }}>
        {name}
      </span>
    </motion.div>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
const STATS = [
  { value: '10K+', label: 'Active Users', icon: Users, color: 'var(--color-brand)' },
  { value: '50K+', label: 'Connections Made', icon: Heart, color: 'var(--color-accent)' },
  { value: '40+', label: 'Countries', icon: Globe, color: 'var(--color-teal)' },
  { value: '95%', label: 'Satisfaction Rate', icon: Star, color: 'var(--color-brand)' },
];

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Search,
    title: 'Smart Discovery',
    desc: 'Find people by name, age, city, or country. AI ranks compatibility so you meet the right people first.',
    color: 'var(--color-brand)',
    bg: 'var(--color-brand-subtle)',
  },
  {
    icon: BrainCircuit,
    title: 'AI Vibe Check',
    desc: 'Get AI-powered compatibility scores and personalised icebreakers, powered by Google Gemini.',
    color: 'var(--color-accent)',
    bg: 'var(--color-accent-subtle)',
  },
  {
    icon: MessageCircle,
    title: 'Real-Time Chat',
    desc: 'Chat securely with matches. React to messages, share moments, and feel genuinely connected.',
    color: 'var(--color-teal)',
    bg: 'var(--color-teal-subtle)',
  },
  {
    icon: Palette,
    title: 'Soul Canvas',
    desc: 'Draw together in real-time on a shared whiteboard. Express yourself beyond words.',
    color: 'var(--color-brand)',
    bg: 'var(--color-brand-subtle)',
  },
  {
    icon: Gift,
    title: 'Virtual Gifts & Points',
    desc: 'Send thoughtful stickers to matches, earn popularity points, and climb the leaderboard.',
    color: 'var(--color-accent)',
    bg: 'var(--color-accent-subtle)',
  },
  {
    icon: ShieldCheck,
    title: 'AI Safety Shield',
    desc: 'AI-powered moderation keeps your experience safe, respectful, and harassment-free.',
    color: 'var(--color-teal)',
    bg: 'var(--color-teal-subtle)',
  },
];

// ── Steps ─────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    icon: UserCheck,
    step: '01',
    title: 'Create Your Profile',
    desc: 'Sign up in seconds. Add your interests, photos, and let your personality shine through your Soul Canvas.',
  },
  {
    icon: Zap,
    step: '02',
    title: 'Discover & Connect',
    desc: 'Browse AI-ranked profiles. See compatibility scores, send a connect request, and wait for the spark.',
  },
  {
    icon: MessagesSquare,
    step: '03',
    title: 'Start Talking',
    desc: 'Your match accepted! Jump into real-time chat, share reactions, draw together, and build something real.',
  },
];

// ── Testimonials ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: 'Aung Kyaw',
    location: 'Yangon, Myanmar',
    text: 'SoulSync matched me based on actual shared interests — not just looks. Met my best friend here and we\'ve been inseparable since.',
    hue: 340,
    stars: 5,
  },
  {
    name: 'Min Thura',
    location: 'Mandalay, Myanmar',
    text: 'The AI icebreakers actually work! I never know what to say first, but SoulSync suggested the perfect opener. We\'ve been chatting for months.',
    hue: 200,
    stars: 5,
  },
  {
    name: 'Zin Mar',
    location: 'Naypyidaw, Myanmar',
    text: 'I love the Soul Canvas feature — drawing with someone you just met is such a fun way to break the ice. Feels different from any other app.',
    hue: 160,
    stars: 5,
  },
];

// ── Main component ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="mesh-bg min-h-screen overflow-x-hidden">

      {/* ════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pt-20 pb-24 text-center overflow-hidden">

        {/* Floating avatars — hidden on small screens */}
        <div className="hidden lg:block">
          {FLOATING_AVATARS.map((a) => (
            <FloatingAvatar key={a.name} {...a}
              style={{ top: a.top, left: (a as any).left, right: (a as any).right }} />
          ))}
        </div>

        {/* Glowing orb behind headline */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(232,96,76,0.1) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>

          {/* Badge */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-7 text-sm font-semibold"
            style={{
              background: 'var(--color-brand-subtle)',
              color: 'var(--color-brand)',
              border: '1px solid rgba(232,96,76,0.2)',
            }}>
            <Sparkles className="w-4 h-4" />
            AI-Enhanced Social Discovery Platform
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.08] tracking-tight mb-6"
            style={{ color: 'var(--text-primary)' }}>
            Where Meaningful
            <br />
            <span style={{
              background: 'linear-gradient(135deg, var(--color-brand) 0%, var(--color-accent) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Connections Begin
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10"
            style={{ color: 'var(--text-secondary)' }}>
            Move beyond the passive scroll. SoulSync uses AI, creative collaboration,
            and real-time interaction to help you form{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>deeper, more genuine connections.</span>
          </p>

          {/* CTA buttons */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {loading ? (
              <div className="w-10 h-10 spinner" />
            ) : user ? (
              <Link href="/discover"
                className="btn-primary px-8 py-3.5 text-base flex items-center gap-2">
                Start Discovering
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link href="/register"
                  className="btn-primary px-8 py-3.5 text-base flex items-center gap-2">
                  Get Started — It&apos;s Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/login"
                  className="btn-secondary px-7 py-3.5 text-base">
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Trust line */}
          {!user && !loading && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="mt-5 text-xs flex items-center justify-center gap-4"
              style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-green-500" /> No credit card required</span>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-green-500" /> Free to join</span>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-green-500" /> AI-powered matching</span>
            </motion.p>
          )}
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════════
          STATS BAR
      ════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="card p-5 text-center"
                style={{ cursor: 'default' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${s.color}18`, color: s.color }}>
                  <Icon className="w-4.5 h-4.5 w-5 h-5" />
                </div>
                <p className="text-2xl font-black tracking-tight" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FEATURES
      ════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-4 text-xs font-semibold"
            style={{ background: 'var(--color-teal-subtle)', color: 'var(--color-teal)', border: '1px solid rgba(42,181,160,0.2)' }}>
            <Sparkles className="w-3.5 h-3.5" />
            Packed with features
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight"
            style={{ color: 'var(--text-primary)' }}>
            Everything You Need to{' '}
            <span style={{ color: 'var(--color-brand)' }}>Connect</span>
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-base" style={{ color: 'var(--text-secondary)' }}>
            A complete platform built around authenticity, creativity, and real human connection.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="card p-6 cursor-default"
                style={{ borderLeft: `3px solid ${f.color}` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: f.bg, color: f.color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      {f.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {f.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-4 text-xs font-semibold"
            style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', border: '1px solid rgba(212,168,83,0.2)' }}>
            <Zap className="w-3.5 h-3.5" />
            Simple as 1-2-3
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            How <span style={{ color: 'var(--color-brand)' }}>SoulSync</span> Works
          </h2>
          <p className="mt-3 max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
            From signup to meaningful conversation in under five minutes.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line between steps (desktop) */}
          <div className="hidden md:block absolute top-10 left-[calc(33%+1rem)] right-[calc(33%+1rem)] h-px"
            style={{ background: 'linear-gradient(to right, var(--color-brand), var(--color-accent))' }} />

          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card p-7 text-center relative"
              >
                {/* Step number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                  style={{ background: 'var(--color-brand)', boxShadow: 'var(--shadow-brand)' }}>
                  {s.step}
                </div>

                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 mt-3"
                  style={{ background: 'var(--color-brand-subtle)', color: 'var(--color-brand)' }}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          TESTIMONIALS
      ════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Real Stories,{' '}
            <span style={{ color: 'var(--color-brand)' }}>Real Connections</span>
          </h2>
          <p className="mt-3 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Thousands of people have found meaningful relationships on SoulSync.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card p-6 flex flex-col gap-4"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, si) => (
                  <Star key={si} className="w-4 h-4" style={{ color: '#D4A853', fill: '#D4A853' }} />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm leading-relaxed flex-1 italic" style={{ color: 'var(--text-secondary)' }}>
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                  style={{ background: `hsl(${t.hue},65%,52%)` }}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          BOTTOM CTA
      ════════════════════════════════════════════════════════ */}
      {!user && !loading && (
        <section className="relative z-10 max-w-4xl mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl p-6 sm:p-10 lg:p-12 text-center"
            style={{
              background: 'linear-gradient(135deg, var(--color-brand) 0%, #C94A38 50%, #D4A853 100%)',
              boxShadow: '0 20px 60px rgba(232,96,76,0.35)',
            }}
          >
            {/* Decorative blobs */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20"
              style={{ background: 'white', filter: 'blur(30px)' }} />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-15"
              style={{ background: 'white', filter: 'blur(25px)' }} />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-5 text-sm font-semibold text-white"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Heart className="w-4 h-4 fill-current" />
                Join 10,000+ members
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">
                Ready to Find Your Match?
              </h2>
              <p className="text-white/80 text-base max-w-md mx-auto mb-8">
                Create your free profile today and let SoulSync&apos;s AI do the magic.
                Your next great connection is waiting.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/register"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-bold transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                  style={{ background: 'white', color: 'var(--color-brand)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                  Create Free Profile
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/login"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)' }}>
                  Sign In
                </Link>
              </div>

              <p className="mt-5 text-white/60 text-xs">
                No credit card · Free forever · Cancel anytime
              </p>
            </div>
          </motion.div>
        </section>
      )}

      {/* Footer note */}
      <div className="relative z-10 text-center pb-12" style={{ color: 'var(--text-muted)' }}>
        <p className="text-xs">
          © 2026 SoulSync — AI-Enhanced Social Discovery Platform
        </p>
      </div>

    </div>
  );
}
