const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a content moderation system for a romantic social platform called SoulSync.
Your job is to classify user messages as SAFE or UNSAFE.

UNSAFE content includes:
- Harassment, threats, bullying, or intimidation
- Hate speech (racism, sexism, homophobia, etc.)
- Explicit sexual content or solicitation
- Sharing personal info of others (doxxing)
- Spam or scam content

SAFE content includes:
- Normal conversation, flirting, compliments
- Sharing interests, hobbies, feelings
- Asking questions, making plans

Respond ONLY with valid JSON in this exact format:
{"safe": true, "reason": ""}
or
{"safe": false, "reason": "Brief reason why this is unsafe"}

Do NOT include any other text outside the JSON.`;

/**
 * Moderate a message before it is stored.
 * Returns { safe: boolean, reason: string }
 * Defaults to safe=true on timeout or error (non-blocking).
 */
async function moderateMessage(text) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500); // 2.5s max

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Message to moderate: "${text}"` },
      ],
      temperature: 0,
      max_tokens: 80,
    });

    clearTimeout(timeout);

    const raw = response.choices[0]?.message?.content?.trim() || '';
    // Extract JSON even if there's surrounding whitespace
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { safe: true, reason: '' };

    const result = JSON.parse(jsonMatch[0]);
    return {
      safe: result.safe !== false, // default safe if unclear
      reason: result.reason || '',
    };
  } catch (err) {
    // On timeout or any error — allow message through
    if (err.name !== 'AbortError') {
      console.warn('[Moderation] Groq error (defaulting to safe):', err.message);
    }
    return { safe: true, reason: '' };
  }
}

module.exports = { moderateMessage };
