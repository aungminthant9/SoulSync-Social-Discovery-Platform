/**
 * Integration Tests — /api/economy routes
 *
 * Covers:
 *   GET  /api/economy/balance       — fetch credits & points
 *   GET  /api/economy/stickers      — list all stickers
 *   GET  /api/economy/leaderboard   — top-10 by points
 *   POST /api/economy/gift          — send a gift
 *   GET  /api/economy/gifts/:matchId — list gifts in a match
 */

process.env.JWT_SECRET = 'test-secret-key';
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

jest.mock('../../config/supabase');
const supabase = require('../../config/supabase');

const jwt = require('jsonwebtoken');
const express = require('express');
const request = require('supertest');
const economyRouter = require('../../routes/economy');

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeToken = (id = 'user-1') =>
  jwt.sign({ id, email: `${id}@test.com` }, 'test-secret-key', { expiresIn: '1h' });

const buildChain = (result) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
    then: (resolve) => Promise.resolve(result).then(resolve),
  };
  return chain;
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  // Make a mock io available on the app
  app.set('io', { to: jest.fn().mockReturnValue({ emit: jest.fn() }) });
  app.use('/api/economy', economyRouter);
  return app;
};

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/economy/balance', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 — no token', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/economy/balance');
    expect(res.status).toBe(401);
  });

  test('200 — returns credits and points', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: { credits: 150, points: 75 }, error: null })
    );
    const res = await request(app)
      .get('/api/economy/balance')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.credits).toBe(150);
    expect(res.body.points).toBe(75);
  });

  test('404 — user not found', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: null, error: { message: 'Not found' } })
    );
    const res = await request(app)
      .get('/api/economy/balance')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/economy/stickers', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 — no token', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/economy/stickers');
    expect(res.status).toBe(401);
  });

  test('200 — returns sticker array', async () => {
    const app = buildApp();
    const mockStickers = [
      { id: 's1', name: 'Heart', icon: '❤️', price_credits: 10, point_value: 5 },
      { id: 's2', name: 'Star', icon: '⭐', price_credits: 20, point_value: 10 },
    ];
    supabase.from.mockImplementation(() =>
      buildChain({ data: mockStickers, error: null })
    );
    const res = await request(app)
      .get('/api/economy/stickers')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.stickers)).toBe(true);
    expect(res.body.stickers).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/economy/leaderboard', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 — returns leaderboard array (up to 10 users)', async () => {
    const app = buildApp();
    const mockLeaderboard = Array.from({ length: 10 }, (_, i) => ({
      id: `user-${i}`,
      name: `User ${i}`,
      avatar_url: null,
      city: '',
      country: '',
      points: 1000 - i * 50,
    }));
    supabase.from.mockImplementation(() =>
      buildChain({ data: mockLeaderboard, error: null })
    );
    const res = await request(app)
      .get('/api/economy/leaderboard')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.leaderboard).toHaveLength(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/economy/gift', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 — no token', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/economy/gift')
      .send({ matchId: 'm1', receiverId: 'u2', stickerId: 's1' });
    expect(res.status).toBe(401);
  });

  test('400 — missing required fields', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/economy/gift')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ matchId: 'm1' }); // missing receiverId and stickerId
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('400 — cannot send gift to yourself', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/economy/gift')
      .set('Authorization', `Bearer ${makeToken('user-1')}`)
      .send({ matchId: 'm1', receiverId: 'user-1', stickerId: 's1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/yourself/i);
  });

  test('403 — sender not part of match', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: { id: 'm1', user1_id: 'user-A', user2_id: 'user-B' }, error: null })
    );
    const res = await request(app)
      .post('/api/economy/gift')
      .set('Authorization', `Bearer ${makeToken('user-outsider')}`)
      .send({ matchId: 'm1', receiverId: 'user-A', stickerId: 's1' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Not part of this match/i);
  });

  test('404 — sticker not found', async () => {
    const app = buildApp();
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return buildChain({ data: { id: 'm1', user1_id: 'user-1', user2_id: 'user-2' }, error: null });
      return buildChain({ data: null, error: { message: 'Not found' } });
    });
    const res = await request(app)
      .post('/api/economy/gift')
      .set('Authorization', `Bearer ${makeToken('user-1')}`)
      .send({ matchId: 'm1', receiverId: 'user-2', stickerId: 'nonexistent' });
    expect(res.status).toBe(404);
  });

  test('400 — insufficient credits', async () => {
    const app = buildApp();
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return buildChain({ data: { id: 'm1', user1_id: 'user-1', user2_id: 'user-2' }, error: null });
      if (callCount === 2)
        return buildChain({ data: { id: 's1', name: 'Heart', icon: '❤️', price_credits: 100, point_value: 50 }, error: null });
      return buildChain({ data: { credits: 10, points: 0, name: 'Alice' }, error: null }); // sender with only 10 credits
    });
    const res = await request(app)
      .post('/api/economy/gift')
      .set('Authorization', `Bearer ${makeToken('user-1')}`)
      .send({ matchId: 'm1', receiverId: 'user-2', stickerId: 's1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Not enough credits/i);
  });

  test('200 — successful gift sends response with newCredits', async () => {
    const app = buildApp();
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return buildChain({ data: { id: 'm1', user1_id: 'user-1', user2_id: 'user-2' }, error: null });
      if (callCount === 2)
        return buildChain({ data: { id: 's1', name: 'Heart', icon: '❤️', price_credits: 10, point_value: 5 }, error: null });
      if (callCount === 3)
        return buildChain({ data: { credits: 100, points: 0, name: 'Alice' }, error: null }); // sender
      if (callCount === 4)
        return buildChain({ data: {}, error: null }); // deduct sender credits
      if (callCount === 5)
        return buildChain({ data: { points: 50 }, error: null }); // receiver
      if (callCount === 6)
        return buildChain({ data: {}, error: null }); // award points
      if (callCount === 7)
        return buildChain({ data: {}, error: null }); // log gift_transaction
      return buildChain({ data: { id: 'msg-1', content: '__GIFT__❤️' }, error: null }); // insert message
    });
    const res = await request(app)
      .post('/api/economy/gift')
      .set('Authorization', `Bearer ${makeToken('user-1')}`)
      .send({ matchId: 'm1', receiverId: 'user-2', stickerId: 's1' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Gift sent/i);
    expect(res.body).toHaveProperty('newCredits');
    expect(res.body.newCredits).toBe(90);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/economy/gifts/:matchId', () => {
  beforeEach(() => jest.clearAllMocks());

  test('403 — user not part of match', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: { id: 'm1', user1_id: 'user-A', user2_id: 'user-B' }, error: null })
    );
    const res = await request(app)
      .get('/api/economy/gifts/m1')
      .set('Authorization', `Bearer ${makeToken('user-outsider')}`);
    expect(res.status).toBe(403);
  });

  test('200 — returns gifts list', async () => {
    const app = buildApp();
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return buildChain({ data: { id: 'm1', user1_id: 'user-1', user2_id: 'user-2' }, error: null });
      return buildChain({ data: [{ id: 'g1', sticker: '❤️', sender_id: 'user-1', receiver_id: 'user-2' }], error: null });
    });
    const res = await request(app)
      .get('/api/economy/gifts/m1')
      .set('Authorization', `Bearer ${makeToken('user-1')}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.gifts)).toBe(true);
    expect(res.body.gifts[0].sticker).toBe('❤️');
  });
});
