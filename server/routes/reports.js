const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── POST /api/reports ─────────────────────────────────────────────────────────
// Body: { reportedId, reason, messageContent? }
router.post('/', authMiddleware, async (req, res) => {
  const { reportedId, reason, messageContent } = req.body;
  const reporterId = req.user.id;

  if (!reportedId || !reason?.trim()) {
    return res.status(400).json({ error: 'reportedId and reason are required.' });
  }
  if (reporterId === reportedId) {
    return res.status(400).json({ error: 'Cannot report yourself.' });
  }

  try {
    // Get AI verdict on the report
    let aiVerdict = 'pending';
    let aiExplanation = '';

    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a trust & safety AI for a romantic social platform called SoulSync.
A user has submitted a report about another user. Evaluate whether the report describes genuinely harmful or policy-violating behavior.

Respond ONLY with valid JSON:
{"verdict": "flagged" or "safe", "explanation": "one sentence explaining your decision"}

"flagged" = the report describes harassment, explicit content, scams, hate speech, threats, or real harm.
"safe" = the report seems false, a misunderstanding, or describes acceptable behavior.`,
          },
          {
            role: 'user',
            content: `Reason for report: "${reason}"\nMessage content (if any): "${messageContent || 'N/A'}"`,
          },
        ],
        temperature: 0,
        max_tokens: 100,
      });

      const raw = response.choices[0]?.message?.content?.trim() || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiVerdict = parsed.verdict === 'flagged' ? 'flagged' : 'safe';
        aiExplanation = parsed.explanation || '';
      }
    } catch (aiErr) {
      console.warn('[Reports] AI verdict failed, defaulting to pending:', aiErr.message);
    }

    // Insert report
    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_id: reportedId,
        reason: reason.trim(),
        message_content: messageContent?.trim() || '',
        ai_verdict: aiVerdict,
        ai_explanation: aiExplanation,
      })
      .select('*')
      .single();

    if (error) throw error;

    res.json({ message: 'Report submitted. Our team will review it shortly.', report });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /api/reports/my ───────────────────────────────────────────────────────
// Returns reports filed by the current user
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const { data: reports } = await supabase
      .from('reports')
      .select('id, reported_id, reason, ai_verdict, ai_explanation, created_at')
      .eq('reporter_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    res.json({ reports: reports || [] });
  } catch (err) {
    console.error('My reports error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
