'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Search, ChevronLeft, ChevronRight, Loader2,
  AlertTriangle, X, Shield, UserCheck, UserX, AlertCircle, Coins, Star,
} from 'lucide-react';

type AdminUser = {
  id: string; name: string; email: string; avatar_url?: string;
  credits: number; points: number;
  is_suspended: boolean; is_banned: boolean; warnings_count: number;
  is_admin: boolean; created_at: string; is_online: boolean;
};
type ActionModal = { user: AdminUser; action: 'warn' | 'suspend' | 'unsuspend' | 'ban' | 'unban' } | null;

export default function AdminUsersPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [actioning, setActioning] = useState(false);

  const LIMIT = 15;

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const data = await api<{ users: AdminUser[]; total: number }>(`/api/admin/users?${params}`, { token });
      setUsers(data.users);
      setTotal(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, page, search, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleAction = async () => {
    if (!actionModal || !token) return;
    setActioning(true);
    try {
      await api(`/api/admin/users/${actionModal.user.id}/action`, { method: 'PUT', token, body: { action: actionModal.action } });
      setActionModal(null);
      fetchUsers();
    } catch (e) { console.error(e); }
    finally { setActioning(false); }
  };

  const getStatusBadge = (u: AdminUser) => {
    if (u.is_admin) return { label: 'Admin', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' };
    if (u.is_banned) return { label: 'Banned', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' };
    if (u.is_suspended) return { label: 'Suspended', color: '#F97316', bg: 'rgba(249,115,22,0.1)' };
    if (u.warnings_count > 0) return { label: `Warned ×${u.warnings_count}`, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' };
    return { label: 'Active', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' };
  };

  const totalPages = Math.ceil(total / LIMIT);

  const FILTERS = [
    { label: 'All Users', value: '' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Banned', value: 'banned' },
    { label: 'Warned', value: 'warned' },
  ];

  const ACTION_CFG: Record<string, { color: string; label: string; description: string }> = {
    warn:      { color: '#F59E0B', label: 'Issue Warning',   description: 'Increment this user\'s warning count. Warnings are visible to admins.' },
    suspend:   { color: '#F97316', label: 'Suspend User',    description: 'Temporarily disable this user\'s account. They cannot log in while suspended.' },
    unsuspend: { color: '#22C55E', label: 'Unsuspend User',  description: 'Restore access to this user\'s suspended account.' },
    ban:       { color: '#EF4444', label: 'Ban User',        description: 'Permanently ban this user. This is a severe action.' },
    unban:     { color: '#22C55E', label: 'Unban User',      description: 'Lift the permanent ban from this user\'s account.' },
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#F8FAFC', fontSize: 22, fontWeight: 700, margin: '0 0 4px', fontFamily: 'Fira Sans, sans-serif' }}>User Management</h1>
          <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>{total} total users</p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#475569' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name…"
            style={{ paddingLeft: 36, paddingRight: 14, height: 38, background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, color: '#F8FAFC', fontSize: 13, outline: 'none', width: 220 }} />
        </div>
      </div>

      {/* Status filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const active = statusFilter === f.value;
          return (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${active ? '#22C55E' : '#1E293B'}`, background: active ? 'rgba(34,197,94,0.1)' : '#0F172A', color: active ? '#22C55E' : '#64748B', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s' }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <Loader2 style={{ width: 28, height: 28, color: '#22C55E', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div style={{ background: '#0F172A', borderRadius: 16, border: '1px solid #1E293B', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr', gap: 12, padding: '12px 20px', borderBottom: '1px solid #1E293B', background: '#0A1120' }}>
            {['User', 'Email', 'Credits / Pts', 'Status', 'Actions'].map(h => (
              <span key={h} style={{ color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>

          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569' }}>
              <UserCheck style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>No users match these filters</p>
            </div>
          ) : (
            users.map((u, i) => {
              const badge = getStatusBadge(u);
              return (
                <motion.div key={u.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr', gap: 12, padding: '14px 20px', borderBottom: i < users.length - 1 ? '1px solid #1E293B' : 'none', alignItems: 'center' }}>

                  {/* User */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `hsl(${u.name.charCodeAt(0) * 137 % 360},55%,38%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 15, flexShrink: 0, overflow: 'hidden' }}>
                      {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>{u.name}</p>
                      <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>
                        Joined {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <p style={{ color: '#64748B', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>

                  {/* Credits/Points */}
                  <div>
                    <p style={{ color: '#F8FAFC', fontSize: 12, margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Coins style={{ width: 11, height: 11, color: '#D4A853' }} />{u.credits}
                    </p>
                    <p style={{ color: '#64748B', fontSize: 12, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Star style={{ width: 11, height: 11, color: '#F59E0B' }} />{u.points} pts
                    </p>
                  </div>

                  {/* Status */}
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: badge.color, background: badge.bg, display: 'inline-block' }}>{badge.label}</span>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {!u.is_admin && !u.is_banned && !u.is_suspended && (
                      <>
                        <button onClick={() => setActionModal({ user: u, action: 'warn' })}
                          style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Warn</button>
                        <button onClick={() => setActionModal({ user: u, action: 'suspend' })}
                          style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(249,115,22,0.1)', color: '#F97316', border: '1px solid rgba(249,115,22,0.2)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Suspend</button>
                        <button onClick={() => setActionModal({ user: u, action: 'ban' })}
                          style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Ban</button>
                      </>
                    )}
                    {!u.is_admin && u.is_suspended && !u.is_banned && (
                      <button onClick={() => setActionModal({ user: u, action: 'unsuspend' })}
                        style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Unsuspend</button>
                    )}
                    {!u.is_admin && u.is_banned && (
                      <button onClick={() => setActionModal({ user: u, action: 'unban' })}
                        style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Unban</button>
                    )}
                    {u.is_admin && <span style={{ color: '#475569', fontSize: 12 }}>—</span>}
                    <Link href={`/users/${u.id}`} target="_blank"
                      style={{ padding: '4px 10px', borderRadius: 6, background: '#1E293B', color: '#64748B', border: '1px solid #1E293B', fontSize: 11, cursor: 'pointer', fontWeight: 600, textDecoration: 'none' }}>View</Link>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '8px 16px', borderRadius: 8, background: '#0F172A', border: '1px solid #1E293B', color: page === 1 ? '#334155' : '#94A3B8', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Prev
          </button>
          <span style={{ color: '#64748B', fontSize: 13 }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '8px 16px', borderRadius: 8, background: '#0F172A', border: '1px solid #1E293B', color: page === totalPages ? '#334155' : '#94A3B8', cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            Next <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      )}

      {/* Confirmation modal */}
      <AnimatePresence>
        {actionModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            onClick={e => { if (e.target === e.currentTarget) setActionModal(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 20, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 25px 80px rgba(0,0,0,0.8)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ color: '#F8FAFC', fontSize: 16, fontWeight: 700, margin: 0 }}>
                  {ACTION_CFG[actionModal.action].label}
                </h3>
                <button onClick={() => setActionModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                  <X style={{ width: 18, height: 18 }} />
                </button>
              </div>
              <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 16 }}>
                {ACTION_CFG[actionModal.action].description} Target: <strong style={{ color: '#F8FAFC' }}>{actionModal.user.name}</strong>
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setActionModal(null)}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: '#1E293B', border: '1px solid #334155', color: '#94A3B8', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  Cancel
                </button>
                <button onClick={handleAction} disabled={actioning}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: ACTION_CFG[actionModal.action].color, color: 'white', border: 'none', cursor: actioning ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: actioning ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {actioning ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} />Working…</> : 'Confirm'}
                </button>
              </div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
