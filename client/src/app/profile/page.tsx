'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { api, uploadFile } from '@/lib/api';
import { motion } from 'framer-motion';
import PhotoGallery from '@/components/PhotoGallery';
import {
  Coins, Star, Calendar, Lock, CheckCircle2, AlertCircle,
  Loader2, Camera, User, MapPin, FileText, Tag, Gift,
} from 'lucide-react';
import HobbyPicker from '@/components/HobbyPicker';

export default function ProfilePage() {
  const { user, token, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ name: '', bio: '', interests: [] as string[], city: '', country: '', is_blurred: false });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    if (file.size > 5 * 1024 * 1024) { setError('Avatar must be under 5 MB.'); return; }
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await uploadFile('/api/users/me/avatar', fd, token);
      await refreshUser();
      setSuccess('Profile picture updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar.');
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) setForm({ name: user.name || '', bio: user.bio || '', interests: user.interests || [], city: user.city || '', country: user.country || '', is_blurred: user.is_blurred || false });
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      const interestsArray = Array.isArray(form.interests) ? form.interests : form.interests.split(',').map((i: string) => i.trim()).filter(Boolean);
      await api('/api/users/me', { method: 'PUT', token: token!, body: { name: form.name, bio: form.bio, interests: interestsArray, city: form.city, country: form.country, is_blurred: form.is_blurred } });
      await refreshUser();
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally { setSaving(false); }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 spinner" /></div>;
  if (!user) return null;

  const hue = user.name ? user.name.charCodeAt(0) * 137 : 0;
  const hue2 = (hue + 55) % 360;
  const avatarGrad = `linear-gradient(145deg, hsl(${hue % 360},65%,52%), hsl(${hue2},70%,42%))`;
  const bannerGrad = `linear-gradient(135deg, hsl(${hue % 360},50%,60%) 0%, hsl(${hue2},55%,45%) 100%)`;

  const age = (() => {
    if (!user.dob) return null;
    const b = new Date(user.dob), t = new Date();
    let a = t.getFullYear() - b.getFullYear();
    if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
    return a;
  })();

  const interestTags = Array.isArray(form.interests) ? form.interests : form.interests.split(',').map((i: string) => i.trim()).filter(Boolean);

  return (
    <div className="mesh-bg min-h-screen pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-8 relative z-10 space-y-4">

        {/* ── Profile hero card ──────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden"
          style={{ borderRadius: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}>

          {/* Banner */}
          <div className="h-28" style={{ background: bannerGrad }} />

          {/* Avatar + info strip */}
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">
              {/* Clickable avatar */}
              <div className="relative group cursor-pointer shrink-0">
                <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name}
                    className="w-24 h-24 rounded-2xl object-cover border-4 shadow-lg"
                    style={{ borderColor: 'var(--bg-card)' }} />
                ) : (
                  <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-black text-white shadow-lg border-4"
                    style={{ background: avatarGrad, borderColor: 'var(--bg-card)' }}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <button onClick={() => avatarFileRef.current?.click()} disabled={avatarUploading}
                  className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.45)' }} title="Change photo">
                  {avatarUploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                </button>
              </div>

              {/* Quick stats */}
              <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-end">
                {age != null && (
                  <div className="flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-1.5 text-xs font-semibold"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <Calendar className="w-3 h-3" />Age {age}
                  </div>
                )}
                <div className="flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-1.5 text-xs font-semibold"
                  style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
                  <Coins className="w-3 h-3" />{user.credits ?? 0} credits
                </div>
                <div className="flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-1.5 text-xs font-semibold"
                  style={{ background: 'var(--color-teal-subtle)', color: 'var(--color-teal)' }}>
                  <Star className="w-3 h-3" />{user.points ?? 0} pts
                </div>
                <div className="hidden sm:flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{ background: 'rgba(212,168,83,0.12)', color: '#D4A853', border: '1px solid rgba(212,168,83,0.2)' }}>
                  <Gift className="w-3 h-3" />{user.total_credits_spent ?? 0} spent on gifts
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{user.name}</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
            <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Camera className="w-3 h-3" /> Hover on your photo to change it
            </p>
          </div>
        </motion.div>

        {/* ── Edit form card ─────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          style={{ borderRadius: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
          className="p-6">

          <h2 className="text-base font-bold mb-5" style={{ color: 'var(--text-primary)' }}>Edit Profile</h2>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl flex items-start gap-2.5 text-sm"
              style={{ background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', color: 'var(--color-error)' }}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
            </div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 rounded-xl flex items-center gap-2.5 text-sm"
              style={{ background: 'rgba(42,181,126,0.08)', border: '1px solid rgba(42,181,126,0.2)', color: 'var(--color-success)' }}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field pl-10" />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Bio</label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3.5 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Tell others about yourself…" rows={3} className="input-field pl-10 resize-none" />
              </div>
            </div>

            {/* Hobbies & Interests */}
            <div>
              <label className="block text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                Hobbies &amp; Interests
              </label>
              <HobbyPicker
                selected={Array.isArray(form.interests) ? form.interests : []}
                onChange={(val) => setForm({ ...form, interests: val })}
              />
            </div>

            {/* City + Country */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>City</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-field pl-10" placeholder="Your city" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Country</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input-field pl-10" placeholder="Your country" />
                </div>
              </div>
            </div>

            {/* Privacy toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: form.is_blurred ? 'rgba(232,96,76,0.12)' : 'var(--bg-card)', color: form.is_blurred ? 'var(--color-brand)' : 'var(--text-muted)' }}>
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Profile Privacy</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {form.is_blurred ? 'Profile is blurred for non-matches' : 'Profile is visible to everyone'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setForm({ ...form, is_blurred: !form.is_blurred })}
                className="relative w-11 h-6 rounded-full transition-all duration-200 cursor-pointer shrink-0"
                style={{ background: form.is_blurred ? 'var(--color-brand)' : 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: form.is_blurred ? 'var(--shadow-brand)' : 'none' }}>
                <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
                  style={{ transform: form.is_blurred ? 'translateX(1.25rem)' : 'translateX(0)' }} />
              </button>
            </div>

            <button type="submit" disabled={saving}
              className="w-full btn-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : 'Save Changes'}
            </button>
          </form>
        </motion.div>

        {/* ── Photos card ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          style={{ borderRadius: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
          className="p-6">
          <h2 className="text-base font-bold mb-5" style={{ color: 'var(--text-primary)' }}>My Photos</h2>
          <PhotoGallery userId={user.id} editable />
        </motion.div>

      </div>
    </div>
  );
}
