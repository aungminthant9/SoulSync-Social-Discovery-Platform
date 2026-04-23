const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const COST = 5;

// POST /api/ai-writer
// body: { type: 'pickup_line'|'poem'|'love_letter', style: string, targetUserId?: string }
router.post('/', authMiddleware, async (req, res) => {
  const { type, style, targetUserId } = req.body;
  const userId = req.user.id;

  const VALID_TYPES = ['pickup_line', 'poem', 'love_letter'];
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid type. Choose: pickup_line, poem, or love_letter.' });
  }

  try {
    // Check credits
    const { data: me } = await supabase.from('users').select('credits, name').eq('id', userId).single();
    if (!me || (me.credits ?? 0) < COST) {
      return res.status(402).json({
        error: `Not enough credits. This costs ${COST} credits.`,
        code: 'INSUFFICIENT_CREDITS',
      });
    }

    // Fetch target profile if provided
    let targetInfo = '';
    if (targetUserId) {
      const { data: target } = await supabase
        .from('users')
        .select('name, bio, interests, city, country')
        .eq('id', targetUserId)
        .single();
      if (target) {
        targetInfo = `
Target person's details:
- Name: ${target.name}
- Bio: "${target.bio || 'No bio.'}"
- Hobbies & Interests: ${(target.interests || []).join(', ') || 'Not listed'}
- Location: ${[target.city, target.country].filter(Boolean).join(', ') || 'Unknown'}`;
      }
    }

    // Build prompt per type
    const styleNote = style ? `Style/tone: ${style}` : 'Style/tone: Romantic and heartfelt';

    const PROMPTS = {
      pickup_line: `You are a witty, charming romantic AI for a dating app called SoulSync.
Generate exactly 3 clever and original pick-up lines.${targetInfo ? `\n${targetInfo}` : '\nMake them fun and playful.'}
${styleNote}
Rules:
- Each line should be unique in approach
- Not creepy or offensive
- Clever wordplay is encouraged
- Return ONLY the 3 lines, numbered 1. 2. 3. — no extra text.`,

      poem: `You are a romantic poet AI for a dating app called SoulSync.
Write a short, beautiful romantic poem (8-12 lines).${targetInfo ? `\n${targetInfo}\nPersonalize the poem to reference their interests or personality.` : ''}
${styleNote}
Rules:
- Use vivid imagery and emotion
- The poem should feel genuine, not generic
- Return ONLY the poem — no title, no extra text.`,

      love_letter: `You are a heartfelt AI writer for a dating app called SoulSync.
Write a warm, sincere love letter (2-3 short paragraphs).${targetInfo ? `\n${targetInfo}\nPersonalize the letter to reflect their personality and interests.` : ''}
${styleNote}
Rules:
- Should feel personal and genuine
- Warm and sincere, not overly dramatic  
- Start with "Dear ${targetUserId ? '[their name]' : 'You'},"
- Return ONLY the letter — no extra commentary.`,
    };

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a creative romantic AI assistant. Follow instructions precisely.' },
        { role: 'user', content: PROMPTS[type] },
      ],
      temperature: 0.9,
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content?.trim() || '';
    if (!content) throw new Error('AI returned empty response.');

    // Deduct credits
    await supabase.from('users').update({ credits: me.credits - COST }).eq('id', userId);

    res.json({ content, type, credits_used: COST, remaining_credits: me.credits - COST });
  } catch (err) {
    console.error('AI Writer error:', err);
    res.status(500).json({ error: 'AI generation failed. Please try again.' });
  }
});

module.exports = router;
