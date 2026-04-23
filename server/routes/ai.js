const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── POST /api/ai/canvas-prompt ────────────────────────────────────────────────
// Generates a unique, creative drawing prompt using Groq (LLaMA 3.3 70B)
router.post('/canvas-prompt', requireAuth, async (req, res) => {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a fun creative director for a couples drawing game called SoulSync Soul Canvas.
Your job is to generate ONE short, creative drawing prompt for a matched couple.

Rules:
- Keep it short (max 8 words)
- Make it romantic, heartwarming, or playful
- It should be simple enough to sketch in 5 minutes
- Be creative and specific — avoid overused clichés
- Do NOT include numbering, bullet points, or quotation marks
- Respond with ONLY the prompt text, nothing else`,
        },
        {
          role: 'user',
          content: 'Generate a unique drawing prompt for us.',
        },
      ],
      temperature: 1.2,
      max_tokens: 50,
    });

    const prompt = completion.choices[0]?.message?.content?.trim() || 'Draw something that makes you smile';
    res.json({ prompt });
  } catch (err) {
    console.error('Groq prompt error:', err.message);
    res.status(500).json({
      error: 'Failed to generate prompt',
      prompt: 'Draw something that makes you smile',
    });
  }
});

// ── POST /api/ai/canvas-score ─────────────────────────────────────────────────
// Scores a canvas drawing (base64 image) against the given prompt using Llama 4 Scout (vision)
router.post('/canvas-score', requireAuth, async (req, res) => {
  const { imageBase64, prompt } = req.body;

  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

  const drawingPrompt = prompt || 'a drawing';

  try {
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
            {
              type: 'text',
              text: `You are a warm and encouraging art judge for a couples drawing game called SoulSync Soul Canvas.

The drawing prompt was: "${drawingPrompt}"

Analyze this drawing and respond with ONLY valid JSON (no markdown, no extra text):
{
  "score": <integer 0-100>,
  "grade": "<one of: A+, A, B+, B, C+, C, D, F>",
  "title": "<a funny 3-5 word title for this artwork>",
  "feedback": "<2-3 warm, fun sentences of feedback — be encouraging, point out what's creative>",
  "emoji": "<single most fitting emoji for this artwork>"
}

Scoring guidance:
- Be generous (even a blank canvas can get 20 for the blank canvas aesthetic)
- A recognisable attempt at the prompt: 55-70
- A clear and creative drawing: 70-85
- An impressive or hilarious drawing: 85-100
- If the canvas appears blank or near-blank: give 15-25 with encouraging words`,
            },
          ],
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const text = (completion.choices[0]?.message?.content || '')
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '');

    let scoreData;
    try {
      scoreData = JSON.parse(text);
    } catch {
      scoreData = {
        score: 70,
        grade: 'B',
        title: 'Modern Masterpiece',
        feedback: "That's a beautifully expressive piece! The creativity really shines through. Keep drawing together!",
        emoji: '🎨',
      };
    }

    res.json(scoreData);
  } catch (err) {
    console.error('Groq score error:', err.message);
    res.status(500).json({
      score: 65,
      grade: 'B',
      title: 'Soul Canvas Classic',
      feedback: "A wonderful attempt! Art is about expression, and you've expressed something unique. Bravo!",
      emoji: '🎨',
    });
  }
});

module.exports = router;
