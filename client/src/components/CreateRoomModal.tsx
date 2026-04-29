'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  X, Plus, Loader2, BookOpen, Coffee, Dumbbell,
  Gamepad2, Mountain, BookMarked, Languages, PartyPopper, MapPin,
} from 'lucide-react';

const PURPOSES = [
  { label: 'Study',             icon: BookOpen,    color: '#5B6AF0' },
  { label: 'Coffee',            icon: Coffee,      color: '#D4A853' },
  { label: 'Workout',           icon: Dumbbell,    color: '#E8604C' },
  { label: 'Gaming',            icon: Gamepad2,    color: '#9B5DE5' },
  { label: 'Hiking',            icon: Mountain,    color: '#2AB5A0' },
  { label: 'Book Club',         icon: BookMarked,  color: '#06D6A0' },
  { label: 'Language Exchange', icon: Languages,   color: '#FB8500' },
  { label: 'Hangout',           icon: PartyPopper, color: '#F72585' },
];

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  defaultCity?: string;
  defaultCountry?: string;
  onCreated: (roomId: string) => void;
}

export default function CreateRoomModal({
  open, onClose, defaultCity = '', defaultCountry = '', onCreated,
}: CreateRoomModalProps) {
  const { token } = useAuth();
  const [name, setName]       = useState('');
  const [purpose, setPurpose] = useState('');
  const [city, setCity]       = useState(defaultCity);
  const [country, setCountry] = useState(defaultCountry);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose) { setError('Please choose a purpose.'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await api<{ room: { id: string } }>('/api/chat-rooms', {
        method: 'POST',
        token: token!,
        body: { name, purpose, city, country },
      });
      // Reset form
      setName(''); setPurpose(''); setCity(defaultCity); setCountry(defaultCountry);
      onCreated(data.room.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(124,58,237,0.25)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4"
              style={{ borderBottom: '1px solid var(--border-default)' }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(124,58,237,0.12)' }}>
                <Plus className="w-5 h-5" style={{ color: '#7C3AED' }} />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Create a Community Room
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  You can only own one active room at a time.
                </p>
              </div>
              <button type="button" onClick={onClose}
                className="p-1.5 rounded-xl cursor-pointer transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

              {/* Purpose selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2.5"
                  style={{ color: 'var(--text-muted)' }}>
                  Purpose *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PURPOSES.map(({ label, icon: Icon, color }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setPurpose(label)}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl cursor-pointer transition-all duration-200"
                      style={{
                        background: purpose === label ? `${color}20` : 'var(--bg-elevated)',
                        border: `1.5px solid ${purpose === label ? color : 'var(--border-default)'}`,
                        color: purpose === label ? color : 'var(--text-muted)',
                        transform: purpose === label ? 'scale(1.05)' : 'scale(1)',
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Room name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  Room Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={purpose ? `e.g., ${purpose} Crew – Downtown` : 'Give your room a name…'}
                  maxLength={60}
                  required
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1.5px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#7C3AED'; }}
                  onBlur={(e) => { (e.target as HTMLElement).style.borderColor = 'var(--border-default)'; }}
                />
                <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>
                  {name.length}/60
                </p>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    Location *
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    required
                    className="px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1.5px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#7C3AED'; }}
                    onBlur={(e) => { (e.target as HTMLElement).style.borderColor = 'var(--border-default)'; }}
                  />
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Country"
                    required
                    className="px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1.5px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#7C3AED'; }}
                    onBlur={(e) => { (e.target as HTMLElement).style.borderColor = 'var(--border-default)'; }}
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#EF4444',
                  }}
                >
                  <X className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !name.trim() || !purpose || !city.trim() || !country.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold cursor-pointer transition-all duration-200 disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #9B5DE5)',
                  color: 'white',
                  boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
                }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {loading ? 'Creating…' : 'Create Room'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
