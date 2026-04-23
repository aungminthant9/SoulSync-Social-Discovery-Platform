const express = require('express');
const multer = require('multer');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const BUCKET = 'user-photos';
const MAX_PHOTOS = 7;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Multer — store in memory, images only, 5 MB max
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

// Ensure the storage bucket exists (runs once at import time)
(async () => {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: true });
    console.log(`✅ Storage bucket "${BUCKET}" created.`);
  }
})();

// ============================================
// POST /api/photos — Upload a photo
// ============================================
router.post('/', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    // Enforce 7-photo limit
    const { count, error: countErr } = await supabase
      .from('user_photos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countErr) throw countErr;
    if ((count ?? 0) >= MAX_PHOTOS) {
      return res.status(400).json({ error: `You can only upload up to ${MAX_PHOTOS} photos.` });
    }

    // Upload to Supabase Storage
    const ext = req.file.originalname.split('.').pop();
    const storagePath = `${userId}/${Date.now()}.${ext}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadErr) {
      console.error('Storage upload error:', uploadErr);
      return res.status(500).json({ error: 'Failed to upload photo.' });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(uploadData.path);

    // Save record to DB
    const { data: photo, error: dbErr } = await supabase
      .from('user_photos')
      .insert({
        user_id: userId,
        url: urlData.publicUrl,
        storage_path: uploadData.path,
      })
      .select('id, url, created_at')
      .single();

    if (dbErr) {
      console.error('DB insert error:', dbErr);
      return res.status(500).json({ error: 'Failed to save photo record.' });
    }

    res.status(201).json({ message: 'Photo uploaded!', photo });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

// ============================================
// GET /api/photos/:userId — Get a user's photos
// ============================================
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.id;

    // Fetch profile to check blur setting
    const { data: profile } = await supabase
      .from('users')
      .select('is_blurred')
      .eq('id', userId)
      .single();

    // Privacy check: blurred profile + not the owner
    if (profile?.is_blurred && userId !== requesterId) {
      // Check if they're matched
      const { data: match } = await supabase
        .from('matches')
        .select('id')
        .or(
          `and(user1_id.eq.${requesterId},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${requesterId})`
        )
        .maybeSingle();

      if (!match) {
        // Not matched — cannot view photos of blurred profile
        return res.json({ photos: [], locked: true });
      }
    }

    const { data: photos, error } = await supabase
      .from('user_photos')
      .select('id, url, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ photos: photos || [], locked: false });
  } catch (err) {
    console.error('Get photos error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// DELETE /api/photos/:photoId — Delete own photo
// ============================================
router.delete('/:photoId', authMiddleware, async (req, res) => {
  try {
    const { photoId } = req.params;
    const userId = req.user.id;

    // Fetch photo — must belong to the requester
    const { data: photo, error: fetchErr } = await supabase
      .from('user_photos')
      .select('id, storage_path, user_id')
      .eq('id', photoId)
      .single();

    if (fetchErr || !photo) {
      return res.status(404).json({ error: 'Photo not found.' });
    }

    if (photo.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorised.' });
    }

    // Remove from storage
    await supabase.storage.from(BUCKET).remove([photo.storage_path]);

    // Remove DB record
    await supabase.from('user_photos').delete().eq('id', photoId);

    res.json({ message: 'Photo deleted.' });
  } catch (err) {
    console.error('Delete photo error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
