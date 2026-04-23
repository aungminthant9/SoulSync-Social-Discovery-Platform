'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flag, Search, ChevronLeft, ChevronRight, Loader2,
  AlertTriangle, CheckCircle, Clock, X, Shield,
} from 'lucide-react';

type Report = {
  id: string; reason: string; message_content: string;
  ai_verdict: string; ai_explanation: string;
  status: string; admin_action: string; created_at: string; reviewed_at: string | null;
  reporter: { id: string; name: string; email: string; avatar_url?: string } | null;
  reported: { id: string; name: string; email: string; avatar_url?: string; is_suspended: boolean; is_banned: boolean; warnings_count: number } | null;
};

const VERDICT_CFG: Record<string, { color: string; bg: string }> = {
  flagged: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  safe:    { color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  pending: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
};
const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  open:      { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: 'Open' },
  dismissed: { color: '#64748B', bg: 'rgba(100,116,139,0.1)', label: 'Dismissed' },
  actioned:  { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', label: 'Actioned' },
};

function VerdictBadge({ verdict }: { verdict: string }) {
  const c = VERDICT_CFG[verdict] ?? VERDICT_CFG.pending;
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: c.color, background: c.bg }}>{verdict.toUpperCase()}</span>;
}
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.open;
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: c.color, background: c.bg }}>{c.label}</span>;
}

type ActionModal = { report: Report; action: 'dismiss' | 'warn' | 'suspend' | 'ban' } | null;

export default function AdminReportsPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [verdictFilter, setVerdictFilter] = useState(searchParams.get('verdict') || '');
  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [actioning, setActioning] = useState(false);

  const LIMIT = 15;

  const fetchReports = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (statusFilter) params.set('status', statusFilter);
      if (verdictFilter) params.set('verdict', verdictFilter);
      const data = await api<{ reports: Report[]; total: number }>(`/api/admin/reports?${params}`, { token });
      setReports(data.reports);
      setTotal(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, page, statusFilter, verdictFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  useEffect(() => { setPage(1); }, [statusFilter, verdictFilter]);

  const handleAction = async () => {
    if (!actionModal || !token) return;
    setActioning(true);
    try {
      const { report, action } = actionModal;
      // Update report status
      const reportStatus = action === 'dismiss' ? 'dismissed' : 'actioned';
      await api(`/api/admin/reports/${report.id}`, { method: 'PUT', token, body: { status: reportStatus, admin_action: action } });

      // If not dismiss, also act on the user
      if (action !== 'dismiss' && report.reported?.id) {
        const userAction = action === 'warn' ? 'warn' : action === 'suspend' ? 'suspend' : 'ban';
        await api(`/api/admin/users/${report.reported.id}/action`, { method: 'PUT', token, body: { action: userAction } });
      }

      setActionModal(null);
      fetchReports();
    } catch (e) { console.error(e); }
    finally { setActioning(false); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  const FILTERS = [
    { label: 'All', status: '', verdict: '' },
    { label: 'Open', status: 'open', verdict: '' },
    { label: 'AI Flagged', status: '', verdict: 'flagged' },
    { label: 'AI Safe', status: '', verdict: 'safe' },
    { label: 'Dismissed', status: 'dismissed', verdict: '' },
    { label: 'Actioned', status: 'actioned', verdict: '' },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#F8FAFC', fontSize: 22, fontWeight: 700, margin: '0 0 4px', fontFamily: 'Fira Sans, sans-serif' }}>Reports Queue</h1>
          <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>{total} total reports</p>
        </div>
        <div style={{ padding: '6px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flag style={{ width: 15, height: 15, color: '#EF4444' }} />
          <span style={{ color: '#EF4444', fontSize: 13, fontWeight: 600 }}>Trust & Safety</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const active = statusFilter === f.status && verdictFilter === f.verdict;
          return (
            <button key={f.label}
              onClick={() => { setStatusFilter(f.status); setVerdictFilter(f.verdict); }}
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
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, padding: '12px 20px', borderBottom: '1px solid #1E293B', background: '#0A1120' }}>
            {['Reporter → Reported', 'Reason', 'AI Verdict', 'Status', 'Actions'].map(h => (
              <span key={h} style={{ color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>

          {reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569' }}>
              <CheckCircle style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>No reports match these filters</p>
            </div>
          ) : (
            reports.map((r, i) => (
              <motion.div key={r.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, padding: '14px 20px', borderBottom: i < reports.length - 1 ? '1px solid #1E293B' : 'none', alignItems: 'center', background: r.ai_verdict === 'flagged' && r.status === 'open' ? 'rgba(239,68,68,0.03)' : 'transparent' }}>

                {/* Reporter → Reported */}
                <div>
                  <p style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 500, margin: '0 0 2px' }}>
                    <span style={{ color: '#94A3B8' }}>{r.reporter?.name ?? '?'}</span>
                    <span style={{ color: '#334155', margin: '0 6px' }}>→</span>
                    <span style={{ color: r.reported?.is_banned ? '#EF4444' : r.reported?.is_suspended ? '#F97316' : '#F8FAFC' }}>
                      {r.reported?.name ?? '?'}
                    </span>
                  </p>
                  <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                {/* Reason */}
                <div title={r.ai_explanation}>
                  <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</p>
                </div>

                {/* AI Verdict */}
                <div><VerdictBadge verdict={r.ai_verdict} /></div>

                {/* Status */}
                <div><StatusBadge status={r.status} /></div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {r.status === 'open' && (
                    <>
                      <button onClick={() => setActionModal({ report: r, action: 'dismiss' })}
                        style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(100,116,139,0.15)', color: '#94A3B8', border: '1px solid #1E293B', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Dismiss</button>
                      <button onClick={() => setActionModal({ report: r, action: 'warn' })}
                        style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Warn</button>
                      <button onClick={() => setActionModal({ report: r, action: 'suspend' })}
                        style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(249,115,22,0.12)', color: '#F97316', border: '1px solid rgba(249,115,22,0.2)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Suspend</button>
                      <button onClick={() => setActionModal({ report: r, action: 'ban' })}
                        style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Ban</button>
                    </>
                  )}
                  {r.status !== 'open' && <span style={{ color: '#334155', fontSize: 12 }}>{r.admin_action || '—'}</span>}
                </div>
              </motion.div>
            ))
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

      {/* Action confirmation modal */}
      <AnimatePresence>
        {actionModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            onClick={e => { if (e.target === e.currentTarget) setActionModal(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 20, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 25px 80px rgba(0,0,0,0.8)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: actionModal.action === 'ban' ? 'rgba(239,68,68,0.12)' : actionModal.action === 'suspend' ? 'rgba(249,115,22,0.12)' : 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield style={{ width: 18, height: 18, color: actionModal.action === 'ban' ? '#EF4444' : actionModal.action === 'suspend' ? '#F97316' : '#F59E0B' }} />
                  </div>
                  <h3 style={{ color: '#F8FAFC', fontSize: 16, fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>
                    {actionModal.action} User
                  </h3>
                </div>
                <button onClick={() => setActionModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4 }}>
                  <X style={{ width: 18, height: 18 }} />
                </button>
              </div>

              <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 6 }}>
                {actionModal.action === 'dismiss'
                  ? 'This report will be marked as dismissed and no action will be taken.'
                  : `This will ${actionModal.action} the user `}
                {actionModal.action !== 'dismiss' && <strong style={{ color: '#F8FAFC' }}>{actionModal.report.reported?.name}</strong>}
                {actionModal.action !== 'dismiss' && ' and mark this report as actioned.'}
              </p>
              {actionModal.report.ai_verdict === 'flagged' && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 16 }}>
                  <p style={{ color: '#EF4444', fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>AI Safety Shield — Flagged</p>
                  <p style={{ color: '#94A3B8', fontSize: 12, margin: 0 }}>{actionModal.report.ai_explanation}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setActionModal(null)}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: '#1E293B', border: '1px solid #334155', color: '#94A3B8', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  Cancel
                </button>
                <button onClick={handleAction} disabled={actioning}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: actionModal.action === 'ban' ? '#EF4444' : actionModal.action === 'suspend' ? '#F97316' : actionModal.action === 'dismiss' ? '#475569' : '#F59E0B', color: 'white', border: 'none', cursor: actioning ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: actioning ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {actioning ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} />Working…</> : `Confirm ${actionModal.action.charAt(0).toUpperCase() + actionModal.action.slice(1)}`}
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
