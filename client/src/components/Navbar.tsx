'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Search,
  Heart,
  Trophy,
  User,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Coins,
  Menu,
  X,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

export default function Navbar() {
  const { user, logout, loading, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch pending request count
  const fetchPendingCount = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api<{ incoming: { id: string }[] }>('/api/matches/requests', { token });
      setPendingCount(data.incoming?.length ?? 0);
    } catch { /* silently ignore */ }
  }, [token]);

  // Fetch unread message count
  const fetchUnreadMessages = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api<{ total: number }>('/api/messages/unread', { token });
      setUnreadMessages(data.total ?? 0);
    } catch { /* silently ignore */ }
  }, [token]);

  useEffect(() => {
    if (user && token) {
      fetchPendingCount();
      fetchUnreadMessages();
      const interval = setInterval(() => {
        fetchPendingCount();
        fetchUnreadMessages();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user, token, fetchPendingCount, fetchUnreadMessages]);

  // Reset counts when visiting relevant pages
  useEffect(() => {
    if (pathname === '/matches') fetchPendingCount();
    if (pathname?.startsWith('/chat/')) {
      // Mark messages as read — unread count will refresh on next poll
      setTimeout(fetchUnreadMessages, 1500);
    }
  }, [pathname, fetchPendingCount, fetchUnreadMessages]);

  // Close dropdown on outside click — must be before any early returns
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Don't show navbar on auth pages
  if (pathname === '/login' || pathname === '/register') return null;

  const navLinks = [
    { href: '/discover', label: 'Discover', icon: Search, badge: 0, msgBadge: 0 },
    { href: '/matches', label: 'Matches', icon: Heart, badge: pendingCount, msgBadge: 0 },
    { href: '/chat', label: 'Chat', icon: MessageCircle, badge: 0, msgBadge: unreadMessages },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy, badge: 0, msgBadge: 0 },
    { href: '/ai-writer', label: 'AI Writer', icon: Sparkles, badge: 0, msgBadge: 0 },
  ];

  return (
    <motion.nav
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      style={{ background: 'var(--bg-nav)', borderBottom: '1px solid var(--border-default)' }}
      className="sticky top-0 z-50 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-brand)' }}>
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Soul<span style={{ color: 'var(--color-brand)' }}>Sync</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = link.href === '/chat'
                  ? pathname?.startsWith('/chat')
                  : pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      background: active ? 'var(--color-brand-subtle)' : 'transparent',
                      color: active ? 'var(--color-brand)' : 'var(--text-secondary)',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                    {/* Notification badge */}
                    {link.badge > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: 'var(--color-brand)', color: 'white' }}
                      >
                        {link.badge > 99 ? '99+' : link.badge}
                      </motion.span>
                    )}
                    {/* Unread messages badge */}
                    {'msgBadge' in link && link.msgBadge > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-0.5 rounded-full px-1.5 text-[10px] font-bold ml-0.5"
                        style={{ background: 'var(--color-teal)', color: 'white' }}
                      >
                        <MessageCircle className="w-2.5 h-2.5" />
                        {link.msgBadge > 99 ? '99+' : link.msgBadge}
                      </motion.span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-[18px] h-[18px]" />
              ) : (
                <Moon className="w-[18px] h-[18px]" />
              )}
            </button>

            {/* Notification Bell */}
            {user && <NotificationBell />}

            {loading ? (
              <div className="w-8 h-8 rounded-full spinner" />
            ) : user ? (
              <>
                {/* Credits Badge */}
                <div
                  className="hidden sm:flex badge badge-accent"
                  style={{ padding: '0.35rem 0.75rem' }}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span className="font-semibold">{user.credits ?? 0}</span>
                </div>

                {/* User Menu */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors"
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover"
                        style={{ border: '2px solid var(--border-subtle)' }}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: 'var(--color-brand)', color: 'white' }}
                      >
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span
                      className="hidden sm:block text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {user.name}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                      style={{ color: 'var(--text-muted)' }}
                    />
                  </button>

                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 mt-2 w-48 card-elevated py-1.5 overflow-hidden"
                      >
                        <Link
                          href="/profile"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <User className="w-4 h-4" />
                          My Profile
                        </Link>
                        <Link
                          href="/earn-credits"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Coins className="w-4 h-4" style={{ color: '#D4A853' }} />
                          <span>Earn Credits</span>
                          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: 'rgba(212,168,83,0.15)', color: '#D4A853' }}>+5</span>
                        </Link>
                        <hr style={{ borderColor: 'var(--border-subtle)' }} className="my-1" />
                        <button
                          onClick={() => {
                            logout();
                            setMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                          style={{ color: 'var(--color-error)' }}
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="md:hidden p-2 rounded-lg transition-colors relative"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  {/* Mobile notification dot */}
                  {pendingCount > 0 && !mobileOpen && (
                    <span
                      className="absolute top-1 right-1 w-2 h-2 rounded-full"
                      style={{ background: 'var(--color-brand)' }}
                    />
                  )}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Log in
                </Link>
                <Link href="/register" className="btn-primary px-4 py-2 text-sm">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileOpen && user && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden pb-4"
            >
              <div className="flex flex-col gap-1 pt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = link.href === '/chat'
                    ? pathname?.startsWith('/chat')
                    : pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium"
                      style={{
                        background: active ? 'var(--color-brand-subtle)' : 'transparent',
                        color: active ? 'var(--color-brand)' : 'var(--text-secondary)',
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {link.label}
                      {link.badge > 0 && (
                        <span className="ml-auto min-w-[1.3rem] h-[1.3rem] rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: 'var(--color-brand)', color: 'white' }}>
                          {link.badge}
                        </span>
                      )}
                      {'msgBadge' in link && link.msgBadge > 0 && (
                        <span className="ml-auto flex items-center gap-0.5 rounded-full px-1.5 text-[10px] font-bold"
                          style={{ background: 'var(--color-teal)', color: 'white' }}>
                          <MessageCircle className="w-2.5 h-2.5" />
                          {link.msgBadge > 99 ? '99+' : link.msgBadge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
