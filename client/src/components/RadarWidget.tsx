'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  Radar, X, MapPin, Users, Plus, Loader2, BookOpen,
  Coffee, Dumbbell, Gamepad2, Mountain, BookMarked, Languages, PartyPopper,
} from 'lucide-react';

type ChatRoom = {
  id: string;
  name: string;
  purpose: string;
  city: string;
  country: string;
  member_count: number;
  owner: { id: string; name: string; avatar_url?: string | null };
};

const PURPOSE_ICONS: Record<string, React.ReactNode> = {
  'Study':             <BookOpen className="w-4 h-4" />,
  'Coffee':            <Coffee className="w-4 h-4" />,
  'Workout':           <Dumbbell className="w-4 h-4" />,
  'Gaming':            <Gamepad2 className="w-4 h-4" />,
  'Hiking':            <Mountain className="w-4 h-4" />,
  'Book Club':         <BookMarked className="w-4 h-4" />,
  'Language Exchange': <Languages className="w-4 h-4" />,
  'Hangout':           <PartyPopper className="w-4 h-4" />,
};

const PURPOSE_COLORS: Record<string, string> = {
  'Study':             '#5B6AF0',
  'Coffee':            '#D4A853',
  'Workout':           '#E8604C',
  'Gaming':            '#9B5DE5',
  'Hiking':            '#2AB5A0',
  'Book Club':         '#06D6A0',
  'Language Exchange': '#FB8500',
  'Hangout':           '#F72585',
};

interface RadarWidgetProps {
  userCity?: string;
  userCountry?: string;
  onCreateRoom: () => void;
}

export default function RadarWidget({ userCity, userCountry, onCreateRoom }: RadarWidgetProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [scanned, setScanned] = useState(false);

  const handleScan = useCallback(async () => {
    if (scanning) return;
    setOpen(true);
    setScanning(true);
    setScanned(false);
    setRooms([]);

    // Animate the radar sweep for 1.8 s before showing results
    await new Promise((r) => setTimeout(r, 1800));

    try {
      const params = new URLSearchParams();
      if (userCity)    params.set('city', userCity);
      if (userCountry) params.set('country', userCountry);
      const data = await api<{ rooms: ChatRoom[] }>(
        `/api/chat-rooms?${params.toString()}`,
        { token: token! }
      );
      setRooms(data.rooms || []);
    } catch {
      setRooms([]);
    } finally {
      setScanning(false);
      setScanned(true);
    }
  }, [scanning, token, userCity, userCountry]);

  const handleClose = () => {
    setOpen(false);
    setScanned(false);
    setRooms([]);
    setScanning(false);
  };

  return (
    <>
      {/* ── Radar trigger button ──────────────────────────────── */}
      <motion.button
        type="button"
        id="radar-scan-btn"
        onClick={handleScan}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 shrink-0"
        style={{
          background: 'linear-gradient(135deg, #7C3AED, #9B5DE5)',
          color: 'white',
          boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
        }}
        title="Find nearby community chat rooms"
      >
        <Radar className="w-4 h-4" />
        <span className="hidden sm:inline">Local Rooms</span>
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-xl animate-ping opacity-20"
          style={{ background: '#7C3AED', animationDuration: '2s' }} />
      </motion.button>

      {/* ── Radar overlay ────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="relative w-full max-w-md rounded-3xl overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid rgba(124,58,237,0.3)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative flex items-center gap-3 px-6 pt-6 pb-4"
                style={{ borderBottom: '1px solid var(--border-default)' }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(124,58,237,0.15)' }}>
                  <Radar className="w-5 h-5" style={{ color: '#7C3AED' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    Community Rooms Radar
                  </h2>
                  {(userCity || userCountry) && (
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      <MapPin className="w-3 h-3 shrink-0" />
                      {[userCity, userCountry].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <button type="button" onClick={handleClose}
                  className="p-1.5 rounded-xl cursor-pointer transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Radar animation while scanning */}
              {scanning && (
                <div className="flex flex-col items-center justify-center py-12 gap-5">
                  <div className="relative w-32 h-32">
                    {/* Outer rings */}
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute inset-0 rounded-full border"
                        style={{
                          borderColor: `rgba(124,58,237,${0.15 * (4 - i)})`,
                          margin: `${(i - 1) * 10}%`,
                        }}
                        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.2, 0.6] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                    {/* Sweep arm */}
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: 'conic-gradient(from 0deg, rgba(124,58,237,0.5) 0deg, transparent 90deg, transparent 360deg)',
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                    {/* Center dot */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#7C3AED' }} />
                    </div>
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Scanning your area…
                  </p>
                </div>
              )}

              {/* Results */}
              {!scanning && scanned && (
                <div className="px-4 py-4 max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                  {rooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{ background: 'var(--bg-elevated)' }}>
                        <Radar className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        No rooms in your area yet
                      </p>
                      <p className="text-xs max-w-[220px]" style={{ color: 'var(--text-muted)' }}>
                        Be the first to create a community room for{' '}
                        {[userCity, userCountry].filter(Boolean).join(', ') || 'your location'}!
                      </p>
                      <button
                        type="button"
                        onClick={() => { handleClose(); onCreateRoom(); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all mt-1"
                        style={{ background: 'linear-gradient(135deg,#7C3AED,#9B5DE5)', color: 'white' }}
                      >
                        <Plus className="w-4 h-4" />
                        Create a Room
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {rooms.map((room, i) => {
                        const color = PURPOSE_COLORS[room.purpose] ?? '#7C3AED';
                        const icon = PURPOSE_ICONS[room.purpose];
                        return (
                          <motion.button
                            key={room.id}
                            type="button"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06 }}
                            onClick={() => { handleClose(); router.push(`/rooms/${room.id}`); }}
                            className="flex items-center gap-3 p-3.5 rounded-2xl text-left cursor-pointer transition-all duration-200 group"
                            style={{
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border-default)',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.borderColor = color;
                              (e.currentTarget as HTMLElement).style.background = `${color}10`;
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
                              (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                            }}
                          >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: `${color}20`, color }}>
                              {icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                                {room.name}
                              </p>
                              <p className="text-xs mt-0.5" style={{ color }}>
                                {room.purpose}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0"
                              style={{ color: 'var(--text-muted)' }}>
                              <Users className="w-3.5 h-3.5" />
                              <span className="text-xs">{room.member_count}</span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              {!scanning && scanned && rooms.length > 0 && (
                <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
                  <button
                    type="button"
                    onClick={() => { handleClose(); onCreateRoom(); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                    style={{
                      background: 'rgba(124,58,237,0.10)',
                      color: '#7C3AED',
                      border: '1px solid rgba(124,58,237,0.25)',
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Create Your Own Room
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
