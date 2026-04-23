const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const VIBE_COST = 5;      // credits
const CACHE_DAYS = 7;     // result cached for 7 days
const TARGET_POINTS = 2;  // points awarded to target for being checked

// ── GET /api/vibe-check/:targetId — Check for cached result ──────────────────
router.get('/:targetId', authMiddleware, async (req, res) => {
  const { targetId } = req.params;
  const requesterId = req.user.id;

  if (requesterId === targetId) {
    return res.status(400).json({ error: 'Cannot vibe check yourself.' });
  }

  try {
    const since = new Date(Date.now() - CACHE_DAYS * 86400 * 1000).toISOString();
    const { data: cached } = await supabase
      .from('vibe_checks')
      .select('*')
      .eq('requester_id', requesterId)
      .eq('target_id', targetId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      return res.json({ result: cached, cached: true });
    }
    res.json({ result: null, cached: false });
  } catch {
    res.json({ result: null, cached: false });
  }
});

// ── POST /api/vibe-check/:targetId — Run AI vibe check ───────────────────────
router.post('/:targetId', authMiddleware, async (req, res) => {
  const { targetId } = req.params;
  const requesterId = req.user.id;

  if (requesterId === targetId) {
    return res.status(400).json({ error: 'Cannot vibe check yourself.' });
  }

  try {
    // Check for recent cache first (free re-view)
    const since = new Date(Date.now() - CACHE_DAYS * 86400 * 1000).toISOString();
    const { data: cached } = await supabase
      .from('vibe_checks')
      .select('*')
      .eq('requester_id', requesterId)
      .eq('target_id', targetId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cached) return res.json({ result: cached, cached: true, credits_used: 0 });

    // Fetch both users in parallel
    const [{ data: me }, { data: target }] = await Promise.all([
      supabase.from('users').select('name, bio, interests, city, country, dob, points').eq('id', requesterId).single(),
      supabase.from('users').select('name, bio, interests, city, country, dob, points, credits').eq('id', targetId).single(),
    ]);

    // Fetch requester credits
    const { data: requesterData } = await supabase.from('users').select('credits').eq('id', requesterId).single();
    if (!requesterData || (requesterData.credits ?? 0) < VIBE_COST) {
      return res.status(402).json({ error: `Not enough credits. Vibe Check costs ${VIBE_COST} credits.`, code: 'INSUFFICIENT_CREDITS' });
    }

    if (!me || !target) return res.status(404).json({ error: 'User not found.' });

    // Compute ages
    const age = (dob) => {
      if (!dob) return 'unknown';
      const b = new Date(dob), t = new Date();
      let a = t.getFullYear() - b.getFullYear();
      if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
      return a;
    };

    const VIBE_TYPES = ['Cosmic Connection', 'Slow Burn', 'Adventure Duo', 'Creative Sparks', 'Soulmate Energy', 'Friendly Vibe', 'Wild Cards', 'Quiet Depth'];

    const prompt = `You are SoulSync's AI compatibility engine. Analyze these two users and return a vibe check report.

USER A (requesting):
Name: ${me.name}
Age: ${age(me.dob)}
Location: ${[me.city, me.country].filter(Boolean).join(', ') || 'unknown'}
Bio: "${me.bio || 'No bio yet.'}"
Hobbies & Interests: ${(me.interests || []).join(', ') || 'None listed'}

USER B (target):
Name: ${target.name}
Age: ${age(target.dob)}
Location: ${[target.city, target.country].filter(Boolean).join(', ') || 'unknown'}
Bio: "${target.bio || 'No bio yet.'}"
Hobbies & Interests: ${(target.interests || []).join(', ') || 'None listed'}

Vibe type MUST be one of: ${VIBE_TYPES.join(' | ')}

Return ONLY valid JSON matching this exact schema:
{
  "score": <integer 0-100>,
  "vibe_type": "<one of the vibe types above>",
  "dimensions": {
    "interests": <0-100>,
    "personality": <0-100>,
    "location": <0-100>,
    "energy": <0-100>
  },
  "insights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "conversation_starter": "<a specific, personalized conversation starter for these two people>"
}`;

    // Call Groq AI
    let result;
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a romantic compatibility AI. Return only valid JSON, no markdown, no extra text.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.75,
      max_tokens: 450,
    });

    const raw = response.choices[0]?.message?.content?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI returned invalid JSON');
    result = JSON.parse(jsonMatch[0]);

    // Validate score
    result.score = Math.min(100, Math.max(0, parseInt(result.score) || 50));
    if (!VIBE_TYPES.includes(result.vibe_type)) result.vibe_type = 'Friendly Vibe';
    if (!Array.isArray(result.insights)) result.insights = [];
    if (!result.conversation_starter) result.conversation_starter = 'What\'s one thing on your bucket list you haven\'t told anyone?';

    // Deduct credits from requester + award points to target
    await Promise.all([
      supabase.from('users').update({ credits: (requesterData.credits - VIBE_COST) }).eq('id', requesterId),
      supabase.from('users').update({ points: (target.points ?? 0) + TARGET_POINTS }).eq('id', targetId),
    ]);

    // Store result
    const { data: saved, error: saveErr } = await supabase
      .from('vibe_checks')
      .insert({
        requester_id: requesterId,
        target_id: targetId,
        score: result.score,
        vibe_type: result.vibe_type,
        dimensions: result.dimensions,
        insights: result.insights,
        conversation_starter: result.conversation_starter,
        credits_charged: VIBE_COST,
      })
      .select('*')
      .single();

    if (saveErr) throw saveErr;

    res.json({ result: saved, cached: false, credits_used: VIBE_COST });
  } catch (err) {
    console.error('Vibe check error:', err);
    res.status(500).json({ error: 'Vibe check failed. Please try again.' });
  }
});

module.exports = router;
