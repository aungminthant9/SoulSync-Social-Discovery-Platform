const express = require('express');
const multer = require('multer');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const AVATAR_BUCKET = 'avatars';

// Multer for avatar uploads (5 MB, images only)
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

// Ensure avatars bucket exists
(async () => {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === AVATAR_BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(AVATAR_BUCKET, { public: true });
    console.log(`✅ Storage bucket "${AVATAR_BUCKET}" created.`);
  }
})();

// ============================================
// GET /api/users/me — Get own profile
// ============================================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [{ data: user, error }, { data: giftData }] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, email, dob, gender, city, country, bio, interests, avatar_url, credits, points, is_blurred, is_admin, is_suspended, is_banned, warnings_count, created_at')
        .eq('id', req.user.id)
        .single(),
      supabase
        .from('gift_transactions')
        .select('sticker:sticker_id(price_credits)')
        .eq('sender_id', req.user.id),
    ]);

    if (error || !user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const total_credits_spent = (giftData || []).reduce(
      (sum, tx) => sum + (tx.sticker?.price_credits ?? 0), 0
    );

    res.json({ user: { ...user, total_credits_spent } });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// PUT /api/users/me — Update own profile
// ============================================
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { name, bio, interests, city, country, avatar_url, is_blurred } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (interests !== undefined) updates.interests = interests;
    if (city !== undefined) updates.city = city;
    if (country !== undefined) updates.country = country;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (is_blurred !== undefined) updates.is_blurred = is_blurred;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('id, name, email, dob, gender, city, country, bio, interests, avatar_url, credits, points, is_blurred, created_at')
      .single();

    if (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'Failed to update profile.' });
    }

    res.json({ message: 'Profile updated!', user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// GET /api/users/:id — Get public profile
// ============================================
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const [{ data: user, error }, { data: giftData }] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, dob, gender, city, country, bio, interests, avatar_url, points, is_blurred, created_at')
        .eq('id', id)
        .single(),
      supabase
        .from('gift_transactions')
        .select('sticker:sticker_id(price_credits)')
        .eq('sender_id', id),
    ]);

    if (error || !user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const total_credits_spent = (giftData || []).reduce(
      (sum, tx) => sum + (tx.sticker?.price_credits ?? 0), 0
    );

    // Compute age from dob
    const computeAge = (dob) => {
      if (!dob) return null;
      const b = new Date(dob), t = new Date();
      let a = t.getFullYear() - b.getFullYear();
      if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
      return a;
    };

    const age = computeAge(user.dob);

    // If profile is blurred and it's not the requesting user, hide details
    if (user.is_blurred && id !== req.user.id) {
      return res.json({
        user: {
          id: user.id,
          name: user.name,
          avatar_url: user.avatar_url,
          is_blurred: true,
          city: '***',
          country: '***',
          bio: 'This profile is private.',
          interests: [],
          points: user.points,
          total_credits_spent,
        },
      });
    }

    res.json({ user: { ...user, age, total_credits_spent } });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// POST /api/users/me/avatar — Upload profile picture
// ============================================
router.post('/me/avatar', authMiddleware, avatarUpload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    // Fetch current avatar_url to delete old file from storage
    const { data: currentUser } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    // Delete old avatar from storage if it exists and is ours
    if (currentUser?.avatar_url) {
      try {
        const url = new URL(currentUser.avatar_url);
        // path format: /storage/v1/object/public/avatars/<path>
        const pathParts = url.pathname.split(`/avatars/`);
        if (pathParts.length > 1) {
          await supabase.storage.from(AVATAR_BUCKET).remove([pathParts[1]]);
        }
      } catch {
        // Non-fatal — old file might not be in our bucket
      }
    }

    // Upload new avatar
    const ext = req.file.originalname.split('.').pop();
    const storagePath = `${userId}/avatar_${Date.now()}.${ext}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadErr) {
      console.error('Avatar upload error:', uploadErr);
      return res.status(500).json({ error: 'Failed to upload avatar.' });
    }

    const { data: urlData } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(uploadData.path);

    // Update user record
    const { data: user, error: dbErr } = await supabase
      .from('users')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', userId)
      .select('id, name, email, dob, gender, city, country, bio, interests, avatar_url, credits, points, is_blurred, created_at')
      .single();

    if (dbErr) throw dbErr;

    res.json({ message: 'Avatar updated!', user });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

module.exports = router;
