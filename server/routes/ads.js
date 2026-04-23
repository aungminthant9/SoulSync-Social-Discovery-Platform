const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const CREDITS_PER_AD = 5;
const MAX_ADS_PER_DAY = 3;

// GET /api/ads/status — How many ads watched today
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('ad_views')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('created_at', since);

    const watched = count ?? 0;
    res.json({
      watched_today: watched,
      remaining: Math.max(0, MAX_ADS_PER_DAY - watched),
      max_per_day: MAX_ADS_PER_DAY,
      credits_per_ad: CREDITS_PER_AD,
      can_watch: watched < MAX_ADS_PER_DAY,
    });
  } catch (err) {
    console.error('Ad status error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/ads/watch — Claim credits after watching ad
router.post('/watch', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    // Check daily limit
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('ad_views')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);

    const watched = count ?? 0;
    if (watched >= MAX_ADS_PER_DAY) {
      return res.status(429).json({
        error: `You've reached your daily limit of ${MAX_ADS_PER_DAY} ads. Come back tomorrow!`,
        code: 'DAILY_LIMIT_REACHED',
      });
    }

    // Get current credits
    const { data: user } = await supabase.from('users').select('credits').eq('id', userId).single();
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const newCredits = (user.credits ?? 0) + CREDITS_PER_AD;

    // Parallel: award credits + record view
    await Promise.all([
      supabase.from('users').update({ credits: newCredits }).eq('id', userId),
      supabase.from('ad_views').insert({ user_id: userId, credits_earned: CREDITS_PER_AD }),
    ]);

    res.json({
      message: `+${CREDITS_PER_AD} credits earned!`,
      credits_earned: CREDITS_PER_AD,
      new_balance: newCredits,
      watched_today: watched + 1,
      remaining: Math.max(0, MAX_ADS_PER_DAY - (watched + 1)),
    });
  } catch (err) {
    console.error('Ad watch error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
