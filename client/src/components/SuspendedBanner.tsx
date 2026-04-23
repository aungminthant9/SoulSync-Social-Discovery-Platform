'use client';

import { useAuth } from '@/context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function SuspendedBanner() {
  const { user } = useAuth();

  if (!user?.is_suspended) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, rgba(249,115,22,0.12) 0%, rgba(249,115,22,0.06) 100%)',
        borderBottom: '1px solid rgba(249,115,22,0.3)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        position: 'sticky',
        top: 64, // below navbar
        zIndex: 40,
      }}
    >
      <ShieldAlert style={{ width: 18, height: 18, color: '#F97316', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span style={{ color: '#F97316', fontWeight: 700, fontSize: 13 }}>Account Suspended — </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Your account has been suspended by our moderation team. Some features may be restricted. Check your notifications for details.
        </span>
      </div>
    </div>
  );
}
