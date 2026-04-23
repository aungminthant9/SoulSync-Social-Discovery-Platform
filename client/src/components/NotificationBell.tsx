'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, AlertTriangle, ShieldAlert, ShieldCheck, ShieldX, Info } from 'lucide-react';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

const TYPE_CFG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  warning:    { icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  suspended:  { icon: ShieldAlert,   color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
  unsuspended:{ icon: ShieldCheck,   color: '#22C55E', bg: 'rgba(34,197,94,0.1)'  },
  banned:     { icon: ShieldX,       color: '#EF4444', bg: 'rgba(239,68,68,0.1)'  },
  unbanned:   { icon: ShieldCheck,   color: '#22C55E', bg: 'rgba(34,197,94,0.1)'  },
  default:    { icon: Info,          color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api<{ notifications: Notification[]; unreadCount: number }>(
        '/api/notifications', { token }
      );
      setNotifications(data.notifications);
      setUnread(data.unreadCount);
    } catch { /* silently ignore */ }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id: string) => {
    if (!token) return;
    try {
      await api(`/api/notifications/${id}/read`, { method: 'PUT', token });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    if (!token) return;
    try {
      await api('/api/notifications/read-all', { method: 'PUT', token });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { /* ignore */ }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        id="notification-bell-btn"
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        className="p-2 rounded-lg transition-colors relative cursor-pointer"
        style={{ color: 'var(--text-secondary)', background: 'none', border: 'none' }}
        aria-label="Notifications"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: 'var(--color-brand)', padding: '0 3px' }}
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              width: 360, maxHeight: 480,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 16,
              boxShadow: 'var(--shadow-xl)',
              zIndex: 200,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell style={{ width: 15, height: 15, color: 'var(--color-brand)' }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Notifications</span>
                {unread > 0 && (
                  <span style={{ padding: '1px 7px', borderRadius: 20, background: 'var(--color-brand)', color: 'white', fontSize: 11, fontWeight: 700 }}>{unread}</span>
                )}
              </div>
              {unread > 0 && (
                <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-brand)', fontWeight: 600 }}>
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <Bell style={{ width: 32, height: 32, margin: '0 auto 10px', color: 'var(--text-muted)', opacity: 0.4 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No notifications yet</p>
                </div>
              ) : (
                notifications.map((n, i) => {
                  const cfg = TYPE_CFG[n.type] ?? TYPE_CFG.default;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n.id}
                      style={{
                        display: 'flex', gap: 12, padding: '12px 16px',
                        borderBottom: i < notifications.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        background: n.is_read ? 'transparent' : 'rgba(232,96,76,0.04)',
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onClick={() => !n.is_read && markRead(n.id)}
                    >
                      {/* Icon */}
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        <Icon style={{ width: 17, height: 17, color: cfg.color }} />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: n.is_read ? 500 : 700, color: 'var(--text-primary)', margin: '0 0 3px', lineHeight: 1.3 }}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-brand)', flexShrink: 0, marginTop: 4 }} />
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px', lineHeight: 1.4 }}>{n.message}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, opacity: 0.7 }}>{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
