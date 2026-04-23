'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { api, uploadFile } from '@/lib/api';
import {
  ImagePlus,
  Trash2,
  Loader2,
  Lock,
  X,
  ZoomIn,
} from 'lucide-react';

type Photo = {
  id: string;
  url: string;
  created_at: string;
};

type PhotoGalleryProps = {
  userId: string;
  /** Show upload/delete controls only for the profile owner */
  editable?: boolean;
  /** Whether photos are behind a privacy lock */
  locked?: boolean;
};

const MAX_PHOTOS = 7;

export default function PhotoGallery({ userId, editable = false, locked = false }: PhotoGalleryProps) {
  const { token } = useAuth();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch photos lazily once (on first render or after mutation)
  const fetchPhotos = useCallback(async () => {
    if (!token) return;
    setLoadingPhotos(true);
    try {
      const data = await api<{ photos: Photo[]; locked: boolean }>(
        `/api/photos/${userId}`,
        { token }
      );
      setPhotos(data.photos);
    } catch {
      setPhotos([]);
    } finally {
      setLoadingPhotos(false);
      setInitialised(true);
    }
  }, [token, userId]);

  // Trigger fetch on mount (via a useEffect-equivalent callback ref pattern)
  if (!initialised && !loadingPhotos && token) {
    fetchPhotos();
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File must be under 5 MB.');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const data = await uploadFile<{ photo: Photo }>('/api/photos', fd, token);
      setPhotos((prev) => [...(prev ?? []), data.photo]);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (photoId: string) => {
    if (!token) return;
    setDeletingId(photoId);
    try {
      await api(`/api/photos/${photoId}`, { method: 'DELETE', token });
      setPhotos((prev) => prev?.filter((p) => p.id !== photoId) ?? []);
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const count = photos?.length ?? 0;
  const canUpload = editable && count < MAX_PHOTOS;

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Photos {photos !== null && `(${count}/${MAX_PHOTOS})`}
        </p>
        {canUpload && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-medium btn-secondary px-3 py-1.5"
          >
            {uploading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
              : <><ImagePlus className="w-3.5 h-3.5" /> Add Photo</>
            }
          </button>
        )}
      </div>

      {/* Hidden file input */}
      {editable && (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      {/* Error */}
      {uploadError && (
        <p className="text-xs mb-3" style={{ color: 'var(--color-error)' }}>
          {uploadError}
        </p>
      )}

      {/* Locked state */}
      {locked && (
        <div
          className="flex flex-col items-center justify-center py-10 rounded-xl gap-2"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
        >
          <Lock className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Photos are private
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Match with this person to see their photos
          </p>
        </div>
      )}

      {/* Loading */}
      {!locked && loadingPhotos && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand)' }} />
        </div>
      )}

      {/* Empty */}
      {!locked && !loadingPhotos && photos !== null && count === 0 && (
        <div
          className="flex flex-col items-center justify-center py-8 rounded-xl gap-2"
          style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-default)' }}
        >
          <ImagePlus className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {editable ? 'No photos yet — add your first!' : 'No photos uploaded.'}
          </p>
        </div>
      )}

      {/* Photo grid */}
      {!locked && !loadingPhotos && photos && count > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <AnimatePresence>
            {photos.map((photo) => (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group rounded-xl overflow-hidden"
                style={{ aspectRatio: '1' }}
              >
                {/* Photo */}
                <img
                  src={photo.url}
                  alt="User photo"
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightbox(photo.url)}
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                  style={{ background: 'rgba(0,0,0,0.4)' }}>
                  <button
                    onClick={() => setLightbox(photo.url)}
                    className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  {editable && (
                    <button
                      onClick={() => handleDelete(photo.id)}
                      disabled={deletingId === photo.id}
                      className="w-8 h-8 rounded-full bg-red-500/80 backdrop-blur flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                    >
                      {deletingId === photo.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Upload slot placeholder */}
            {canUpload && (
              <motion.button
                layout
                key="upload-slot"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-xl flex flex-col items-center justify-center gap-1 transition-colors"
                style={{
                  aspectRatio: '1',
                  background: 'var(--bg-elevated)',
                  border: '2px dashed var(--border-default)',
                  color: 'var(--text-muted)',
                }}
                whileHover={{ borderColor: 'var(--color-brand)', color: 'var(--color-brand)' }}
              >
                {uploading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <ImagePlus className="w-5 h-5" />}
                <span style={{ fontSize: '0.65rem' }}>{uploading ? 'Uploading…' : 'Add'}</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.9)' }}
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
              onClick={() => setLightbox(null)}
            >
              <X className="w-5 h-5" />
            </button>
            <motion.img
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              src={lightbox}
              alt="Full size"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
