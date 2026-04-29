'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import UserCard, { DiscoverUser } from '@/components/UserCard';
import RadarWidget from '@/components/RadarWidget';
import CreateRoomModal from '@/components/CreateRoomModal';
import {
  Search,
  SlidersHorizontal,
  X,
  Loader2,
  Users,
  RefreshCw,
  Sparkles,
  MapPin,
  CalendarDays,
} from 'lucide-react';

type Pagination = {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

type Filters = {
  name: string;
  minAge: string;
  maxAge: string;
  city: string;
  country: string;
};

const DEFAULT_FILTERS: Filters = {
  name: '',
  minAge: '',
  maxAge: '',
  city: '',
  country: '',
};

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-[1.25rem] overflow-hidden animate-pulse"
      style={{
        background: 'var(--bg-elevated)',
        aspectRatio: '3/4',
        position: 'relative',
      }}
    >
      {/* shimmer overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.05) 50%, transparent 60%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }}
      />
      {/* bottom info ghost */}
      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <div className="h-2.5 w-24 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div className="h-4 w-32 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <div className="w-10 h-10 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
      </div>
    </div>
  );
}

// ── Filter chip ───────────────────────────────────────────────────────────────
function Chip({
  active,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer shrink-0"
      style={
        active
          ? {
              background: 'var(--color-brand)',
              color: 'white',
              boxShadow: '0 2px 10px rgba(232,96,76,0.3)',
            }
          : {
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
            }
      }
    >
      {icon}
      {label}
    </button>
  );
}

export default function DiscoverPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchUsers = useCallback(
    async (currentFilters: Filters, page = 1, append = false) => {
      if (!token) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: '18' });
        if (currentFilters.name) params.set('name', currentFilters.name);
        if (currentFilters.minAge) params.set('minAge', currentFilters.minAge);
        if (currentFilters.maxAge) params.set('maxAge', currentFilters.maxAge);
        if (currentFilters.city) params.set('city', currentFilters.city);
        if (currentFilters.country) params.set('country', currentFilters.country);

        const data = await api<{ users: DiscoverUser[]; pagination: Pagination }>(
          `/api/discover?${params.toString()}`,
          { token }
        );
        setUsers((prev) => (append ? [...prev, ...data.users] : data.users));
        setPagination(data.pagination);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load users.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (user && token) fetchUsers(DEFAULT_FILTERS);
  }, [user, token, fetchUsers]);

  const handleNameChange = (value: string) => {
    const next = { ...filters, name: value };
    setFilters(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setAppliedFilters(next);
      fetchUsers(next, 1, false);
    }, 350);
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    fetchUsers(filters, 1, false);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    fetchUsers(DEFAULT_FILTERS, 1, false);
    setShowFilters(false);
  };

  const handleLoadMore = () => {
    if (!pagination?.hasMore) return;
    fetchUsers(appliedFilters, pagination.page + 1, true);
  };

  // Quick filter chip toggles (open panel + focus relevant field)
  const hasAgeFilter = !!(appliedFilters.minAge || appliedFilters.maxAge);
  const hasLocationFilter = !!(appliedFilters.city || appliedFilters.country);

  const activeFilterCount = Object.values(appliedFilters).filter(
    (v, i) => i > 0 && v !== ''
  ).length;

  const hasAnyFilter = activeFilterCount > 0 || filters.name;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 spinner" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="mesh-bg min-h-screen">
      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-8 pb-16">

        {/* ── Hero header ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          {/* AI badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-4 text-xs font-semibold"
            style={{
              background: 'var(--color-brand-subtle)',
              color: 'var(--color-brand)',
              border: '1px solid rgba(232,96,76,0.2)',
            }}>
            <Sparkles className="w-3.5 h-3.5" />
            AI-Enhanced Social Discovery
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-2"
            style={{ color: 'var(--text-primary)' }}>
            Discover{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--color-brand), var(--color-accent))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              People
            </span>
          </h1>

          <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Find your next meaningful connection — powered by compatibility intelligence.
          </p>

          {/* Stats pill */}
          {pagination && !loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 mt-4 rounded-full px-3.5 py-1.5 text-xs font-medium"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
              }}
            >
              <Users className="w-3.5 h-3.5" style={{ color: 'var(--color-teal)' }} />
              <span>
                <strong style={{ color: 'var(--text-primary)' }}>{pagination.total.toLocaleString()}</strong> people to meet
              </span>
              {hasAnyFilter && (
                <>
                  <span style={{ color: 'var(--border-default)' }}>·</span>
                  <span>
                    Showing <strong style={{ color: 'var(--color-brand)' }}>{users.length}</strong>
                  </span>
                </>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* ── Search + filter bar ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="mb-3"
        >
          <div
            className="flex gap-2 p-2 rounded-2xl"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {/* Search input */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                value={filters.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Search by name…"
                className="w-full h-10 pl-10 pr-4 text-sm rounded-xl outline-none transition-all duration-200"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid transparent',
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-brand)'; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'transparent'; }}
              />
            </div>

            {/* Radar Widget */}
            <RadarWidget
              userCity={user?.city}
              userCountry={user?.country}
              onCreateRoom={() => setShowCreateRoom(true)}
            />

            {/* Filter toggle */}
            <button
              type="button"
              onClick={() => setShowFilters((s) => !s)}
              className="relative flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer shrink-0"
              style={
                showFilters || activeFilterCount > 0
                  ? {
                      background: 'var(--color-brand)',
                      color: 'white',
                      boxShadow: 'var(--shadow-brand)',
                    }
                  : {
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-default)',
                    }
              }
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 min-w-[1.1rem] h-[1.1rem] rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                  style={{ background: 'var(--color-accent)' }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Clear */}
            <AnimatePresence>
              {hasAnyFilter && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={handleResetFilters}
                  title="Clear all filters"
                  className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-200 cursor-pointer shrink-0"
                  style={{
                    background: 'rgba(224,82,82,0.08)',
                    color: 'var(--color-error)',
                    border: '1px solid rgba(224,82,82,0.15)',
                  }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Create Room Modal */}
        <CreateRoomModal
          open={showCreateRoom}
          onClose={() => setShowCreateRoom(false)}
          defaultCity={user?.city ?? ''}
          defaultCountry={user?.country ?? ''}
          onCreated={(roomId) => { setShowCreateRoom(false); router.push(`/rooms/${roomId}`); }}
        />

        {/* ── Quick filter chips ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex gap-2 overflow-x-auto pb-1 mb-5 no-scrollbar"
          style={{ scrollbarWidth: 'none' }}
        >
          <Chip
            label="Age Range"
            icon={<CalendarDays className="w-3 h-3" />}
            active={hasAgeFilter}
            onClick={() => setShowFilters(true)}
          />
          <Chip
            label="Location"
            icon={<MapPin className="w-3 h-3" />}
            active={hasLocationFilter}
            onClick={() => setShowFilters(true)}
          />
          <Chip
            label="All Filters"
            icon={<SlidersHorizontal className="w-3 h-3" />}
            active={showFilters}
            onClick={() => setShowFilters((s) => !s)}
          />
        </motion.div>

        {/* ── Filter panel ─────────────────────────────────────── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden mb-6"
            >
              <div
                className="rounded-2xl p-5"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-4"
                  style={{ color: 'var(--text-muted)' }}>
                  Filter People
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Min Age */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Min Age
                    </label>
                    <input
                      type="number" min={18} max={100}
                      value={filters.minAge}
                      onChange={(e) => setFilters((f) => ({ ...f, minAge: e.target.value }))}
                      placeholder="18"
                      className="input-field pl-4 text-sm"
                    />
                  </div>
                  {/* Max Age */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Max Age
                    </label>
                    <input
                      type="number" min={18} max={100}
                      value={filters.maxAge}
                      onChange={(e) => setFilters((f) => ({ ...f, maxAge: e.target.value }))}
                      placeholder="99"
                      className="input-field pl-4 text-sm"
                    />
                  </div>
                  {/* City */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      City
                    </label>
                    <input
                      type="text"
                      value={filters.city}
                      onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                      placeholder="e.g. Yangon"
                      className="input-field pl-4 text-sm"
                    />
                  </div>
                  {/* Country */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Country
                    </label>
                    <input
                      type="text"
                      value={filters.country}
                      onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
                      placeholder="e.g. Myanmar"
                      className="input-field pl-4 text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleApplyFilters}
                    className="btn-primary px-5 py-2 text-sm"
                  >
                    Apply Filters
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="btn-secondary px-4 py-2 text-sm flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading skeleton grid ────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────── */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl text-sm mb-6"
            style={{
              background: 'rgba(224,82,82,0.07)',
              border: '1px solid rgba(224,82,82,0.15)',
              color: 'var(--color-error)',
            }}
          >
            <X className="w-4 h-4 shrink-0" />
            {error}
            <button
              type="button"
              onClick={() => fetchUsers(appliedFilters)}
              className="ml-auto text-xs underline opacity-80 hover:opacity-100 cursor-pointer"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* ── Empty state ─────────────────────────────────────── */}
        {!loading && !error && users.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-28 text-center"
          >
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{
                background: 'var(--color-brand-subtle)',
                border: '1px solid rgba(232,96,76,0.15)',
              }}
            >
              <Users className="w-9 h-9" style={{ color: 'var(--color-brand)' }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              No people found
            </h3>
            <p className="text-sm max-w-xs mb-7" style={{ color: 'var(--text-secondary)' }}>
              Try adjusting your filters or search term to discover more people.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-primary px-7 py-2.5 text-sm"
            >
              Clear Filters
            </button>
          </motion.div>
        )}

        {/* ── User cards grid ──────────────────────────────────── */}
        {!loading && users.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
          >
            {users.map((u, i) => (
              <UserCard key={u.id} user={u} index={i} />
            ))}
          </motion.div>
        )}

        {/* ── Load more ────────────────────────────────────────── */}
        {!loading && pagination?.hasMore && (
          <div className="flex justify-center mt-12">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2.5 px-8 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-60"
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-brand)' }} />
                  Loading more…
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" style={{ color: 'var(--color-brand)' }} />
                  Load more people
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
