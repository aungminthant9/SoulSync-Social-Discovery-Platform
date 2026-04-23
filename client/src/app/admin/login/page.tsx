'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Shield, Loader2, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user?.is_admin) router.push('/admin');
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await login(email, password);
      // Auth context will re-run useEffect above
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#020617',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, fontFamily: 'Fira Sans, sans-serif',
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Fira+Sans:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ width: '100%', maxWidth: 400, background: '#0F172A', borderRadius: 20, border: '1px solid #1E293B', padding: 36, boxShadow: '0 25px 80px rgba(0,0,0,0.6)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 60, height: 60, margin: '0 auto 16px', background: 'linear-gradient(135deg, #E8604C, #D4A853)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(232,96,76,0.35)' }}>
            <Shield style={{ width: 30, height: 30, color: 'white' }} />
          </div>
          <h1 style={{ color: '#F8FAFC', fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>Admin Portal</h1>
          <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>SoulSync Trust & Safety</p>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, marginBottom: 20, color: '#EF4444', fontSize: 13 }}>
            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em' }}>EMAIL</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="admin@soulsync.app"
              style={{ width: '100%', padding: '12px 14px', background: '#1E293B', border: '1px solid #334155', borderRadius: 10, color: '#F8FAFC', fontSize: 14, outline: 'none', fontFamily: 'Fira Sans, sans-serif' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em' }}>PASSWORD</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px 14px', background: '#1E293B', border: '1px solid #334155', borderRadius: 10, color: '#F8FAFC', fontSize: 14, outline: 'none', fontFamily: 'Fira Sans, sans-serif' }}
            />
          </div>
          <button type="submit" disabled={submitting}
            style={{ marginTop: 4, padding: '13px 0', background: 'linear-gradient(135deg, #E8604C, #D4A853)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: submitting ? 0.7 : 1, transition: 'opacity 0.2s', fontFamily: 'Fira Sans, sans-serif' }}>
            {submitting ? <><Loader2 style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite' }} />Signing in…</> : 'Sign in to Admin'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, color: '#334155', fontSize: 12 }}>
          Admin access only. Unauthorized access is prohibited.
        </p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
