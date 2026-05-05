/**
 * Unit Tests — economy helpers
 *
 * Tests pure arithmetic / guard logic extracted from routes/economy.js
 * without any network or database dependency.
 */

// ── Credit deduction logic ────────────────────────────────────────────────────
function deductCredits(currentCredits, cost) {
  return Math.max(0, currentCredits - cost);
}

// ── Gift validation (mirrors the guard in POST /api/economy/gift) ─────────────
function validateGiftRequest({ matchId, receiverId, stickerId, senderId }) {
  if (!matchId || !receiverId || !stickerId) {
    return 'matchId, receiverId, and stickerId are required.';
  }
  if (senderId === receiverId) {
    return 'Cannot send a gift to yourself.';
  }
  return null;
}

// ── Sufficient credits check ──────────────────────────────────────────────────
function hasSufficientCredits(currentCredits, cost) {
  return (currentCredits ?? 0) >= cost;
}

describe('Economy Route — pure helper logic (unit)', () => {
  // ── deductCredits ────────────────────────────────────────────────────────────
  describe('deductCredits()', () => {
    test('subtracts cost from credits', () => {
      expect(deductCredits(100, 30)).toBe(70);
    });

    test('floors at 0 — never returns negative credits', () => {
      expect(deductCredits(10, 50)).toBe(0);
    });

    test('returns 0 when credits equal cost', () => {
      expect(deductCredits(50, 50)).toBe(0);
    });

    test('returns full credits when cost is 0', () => {
      expect(deductCredits(200, 0)).toBe(200);
    });
  });

  // ── validateGiftRequest ──────────────────────────────────────────────────────
  describe('validateGiftRequest()', () => {
    const valid = {
      matchId: 'match-1',
      receiverId: 'user-2',
      stickerId: 'sticker-3',
      senderId: 'user-1',
    };

    test('returns null for a valid gift request', () => {
      expect(validateGiftRequest(valid)).toBeNull();
    });

    test('returns error when matchId is missing', () => {
      expect(validateGiftRequest({ ...valid, matchId: undefined })).toMatch(
        /matchId.*required/i
      );
    });

    test('returns error when receiverId is missing', () => {
      expect(validateGiftRequest({ ...valid, receiverId: undefined })).toMatch(
        /receiverId.*required/i
      );
    });

    test('returns error when stickerId is missing', () => {
      expect(validateGiftRequest({ ...valid, stickerId: undefined })).toMatch(
        /stickerId.*required/i
      );
    });

    test('returns error when sender equals receiver (self-gift)', () => {
      expect(
        validateGiftRequest({ ...valid, senderId: 'user-2', receiverId: 'user-2' })
      ).toMatch(/yourself/i);
    });
  });

  // ── hasSufficientCredits ─────────────────────────────────────────────────────
  describe('hasSufficientCredits()', () => {
    test('returns true when user has more than enough credits', () => {
      expect(hasSufficientCredits(100, 50)).toBe(true);
    });

    test('returns true when user has exactly enough credits', () => {
      expect(hasSufficientCredits(50, 50)).toBe(true);
    });

    test('returns false when user does not have enough credits', () => {
      expect(hasSufficientCredits(10, 50)).toBe(false);
    });

    test('treats null credits as 0', () => {
      expect(hasSufficientCredits(null, 10)).toBe(false);
      expect(hasSufficientCredits(null, 0)).toBe(true);
    });
  });
});
