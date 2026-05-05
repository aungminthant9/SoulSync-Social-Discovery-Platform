const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ============================================
// GET /api/discover
// Query params: name, minAge, maxAge, city, country, page, limit
// ============================================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      name = '',
      minAge,
      maxAge,
      city = '',
      country = '',
      page = 1,
      limit = 20,
      sort = 'points', // 'points' | 'newest' | 'random'
    } = req.query;

    // Fetch existing matches to exclude matched users from results
    const { data: existingMatches } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${req.user.id},user2_id.eq.${req.user.id}`);

    // Fetch block relationships (both directions) to exclude them
    const { data: blocks } = await supabase
      .from('user_blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${req.user.id},blocked_id.eq.${req.user.id}`);

    // Build set of IDs to exclude: self + all matched + all blocked users
    const excludedIds = new Set([req.user.id]);
    (existingMatches || []).forEach((m) => {
      if (m.user1_id !== req.user.id) excludedIds.add(m.user1_id);
      if (m.user2_id !== req.user.id) excludedIds.add(m.user2_id);
    });
    (blocks || []).forEach((b) => {
      if (b.blocker_id !== req.user.id) excludedIds.add(b.blocker_id);
      if (b.blocked_id !== req.user.id) excludedIds.add(b.blocked_id);
    });

    // Build Supabase query — exclude self and matched users
    let query = supabase
      .from('users')
      .select('id, name, dob, gender, city, country, bio, interests, avatar_url, points, is_blurred, created_at')
      .not('id', 'in', `(${[...excludedIds].join(',')})`);

    // Name filter (case-insensitive)
    if (name && name.trim()) {
      query = query.ilike('name', `%${name.trim()}%`);
    }

    // City filter (case-insensitive)
    if (city && city.trim()) {
      query = query.ilike('city', `%${city.trim()}%`);
    }

    // Country filter (case-insensitive)
    if (country && country.trim()) {
      query = query.ilike('country', `%${country.trim()}%`);
    }

    // Apply server-side ordering (random handled later in-memory)
    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'random') {
      query = query.order('id', { ascending: true }); // stable fetch; shuffle in-memory
    } else {
      query = query.order('points', { ascending: false });
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Discover query error:', error);
      return res.status(500).json({ error: 'Failed to fetch users.' });
    }

    // Helper: calculate age from dob string
    const calcAge = (dob) => {
      if (!dob) return null;
      const birth = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age;
    };

    // Apply age filter in-memory (Supabase doesn't have native age from dob)
    let filtered = users;

    if (minAge || maxAge) {
      const min = minAge ? parseInt(minAge, 10) : 0;
      const max = maxAge ? parseInt(maxAge, 10) : 200;
      filtered = filtered.filter((u) => {
        const age = calcAge(u.dob);
        if (age === null) return false;
        return age >= min && age <= max;
      });
    }

    // Shuffle in-memory when sort=random (Fisher-Yates)
    if (sort === 'random') {
      for (let i = filtered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
      }
    }

    // Total count before pagination
    const total = filtered.length;

    // Paginate
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const start = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(start, start + limitNum);

    // Shape response — respect is_blurred for each user
    const shaped = paginated.map((u) => {
      const age = calcAge(u.dob);

      if (u.is_blurred) {
        return {
          id: u.id,
          name: u.name,
          avatar_url: u.avatar_url,
          is_blurred: true,
          age: null,
          city: null,
          country: null,
          bio: null,
          interests: [],
          points: u.points,
          gender: null,
        };
      }

      return {
        id: u.id,
        name: u.name,
        avatar_url: u.avatar_url,
        is_blurred: false,
        age,
        city: u.city,
        country: u.country,
        bio: u.bio,
        interests: u.interests || [],
        points: u.points,
        gender: u.gender,
      };
    });

    res.json({
      users: shaped,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: start + limitNum < total,
      },
    });
  } catch (err) {
    console.error('Discover error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
