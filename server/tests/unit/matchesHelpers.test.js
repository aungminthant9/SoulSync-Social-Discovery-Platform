/**
 * Unit Tests — match-request helper logic (mirrors routes/matches.js)
 *
 * Tests pure guards / data-shaping functions without HTTP or database.
 */

// ── Self-request guard ────────────────────────────────────────────────────────
function isSelfRequest(senderId, receiverId) {
  return senderId === receiverId;
}

// ── Response action validation ────────────────────────────────────────────────
function isValidAction(action) {
  return ['accept', 'reject'].includes(action);
}

// ── Match shaping (mirrors the .map() in GET /api/matches) ───────────────────
function shapeMatches(matches, userId) {
  return matches.map((m) => {
    const other = m.user1?.id === userId ? m.user2 : m.user1;
    return {
      matchId: m.id,
      createdAt: m.created_at,
      user: other,
    };
  });
}

// ── Authorization check for unmatch ──────────────────────────────────────────
function isPartOfMatch(match, userId) {
  return match.user1_id === userId || match.user2_id === userId;
}

describe('Matches Route — pure helper logic (unit)', () => {
  // ── Self-request ─────────────────────────────────────────────────────────────
  describe('isSelfRequest()', () => {
    test('returns true when sender equals receiver', () => {
      expect(isSelfRequest('user-1', 'user-1')).toBe(true);
    });

    test('returns false for different users', () => {
      expect(isSelfRequest('user-1', 'user-2')).toBe(false);
    });
  });

  // ── Action validation ─────────────────────────────────────────────────────────
  describe('isValidAction()', () => {
    test('accepts "accept"', () => {
      expect(isValidAction('accept')).toBe(true);
    });

    test('accepts "reject"', () => {
      expect(isValidAction('reject')).toBe(true);
    });

    test('rejects arbitrary strings', () => {
      expect(isValidAction('delete')).toBe(false);
      expect(isValidAction('')).toBe(false);
      expect(isValidAction(null)).toBe(false);
    });
  });

  // ── Match shaping ─────────────────────────────────────────────────────────────
  describe('shapeMatches()', () => {
    const userId = 'user-A';
    const rawMatches = [
      {
        id: 'match-1',
        created_at: '2024-01-01T00:00:00Z',
        user1: { id: 'user-A', name: 'Alice' },
        user2: { id: 'user-B', name: 'Bob' },
      },
      {
        id: 'match-2',
        created_at: '2024-02-01T00:00:00Z',
        user1: { id: 'user-C', name: 'Charlie' },
        user2: { id: 'user-A', name: 'Alice' },
      },
    ];

    test('returns correct number of shaped matches', () => {
      expect(shapeMatches(rawMatches, userId)).toHaveLength(2);
    });

    test('returns the "other" user when current user is user1', () => {
      const shaped = shapeMatches([rawMatches[0]], userId);
      expect(shaped[0].user.name).toBe('Bob');
    });

    test('returns the "other" user when current user is user2', () => {
      const shaped = shapeMatches([rawMatches[1]], userId);
      expect(shaped[0].user.name).toBe('Charlie');
    });

    test('includes matchId and createdAt in each shaped match', () => {
      const shaped = shapeMatches([rawMatches[0]], userId);
      expect(shaped[0]).toHaveProperty('matchId', 'match-1');
      expect(shaped[0]).toHaveProperty('createdAt');
    });
  });

  // ── Authorization check ───────────────────────────────────────────────────────
  describe('isPartOfMatch()', () => {
    const match = { user1_id: 'user-A', user2_id: 'user-B' };

    test('returns true when user is user1', () => {
      expect(isPartOfMatch(match, 'user-A')).toBe(true);
    });

    test('returns true when user is user2', () => {
      expect(isPartOfMatch(match, 'user-B')).toBe(true);
    });

    test('returns false for an unrelated user', () => {
      expect(isPartOfMatch(match, 'user-C')).toBe(false);
    });
  });
});
