/**
 * Integration Tests — /api/matches routes
 *
 * Covers:
 *   POST   /api/matches/request          — send a match request
 *   GET    /api/matches/requests         — list incoming/outgoing requests
 *   PUT    /api/matches/respond          — accept or reject a request
 *   GET    /api/matches                  — list active matches
 *   DELETE /api/matches/requests/:id     — cancel a pending request
 *   DELETE /api/matches/:matchId         — unmatch
 */

process.env.JWT_SECRET = 'test-secret-key';
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

jest.mock('../../config/supabase');
const supabase = require('../../config/supabase');

const jwt = require('jsonwebtoken');
const express = require('express');
const request = require('supertest');
const matchesRouter = require('../../routes/matches');

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
  app.use('/api/matches', matchesRouter);
  return app;
};

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/matches/request', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 — no auth token', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/matches/request').send({ receiverId: 'user-2' });
    expect(res.status).toBe(401);
  });

  test('400 — missing receiverId', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/matches/request')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/receiverId.*required/i);
  });

  test('400 — cannot send request to yourself', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/matches/request')
      .set('Authorization', `Bearer ${makeToken('user-1')}`)
      .send({ receiverId: 'user-1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/yourself/i);
  });

  test('404 — receiver user not found', async () => {
    const app = buildApp();
    // receiver lookup returns nothing
    supabase.from.mockImplementation(() =>
      buildChain({ data: null, error: null })
    );
    const res = await request(app)
      .post('/api/matches/request')
      .set('Authorization', `Bearer ${makeToken('user-1')}`)
      .send({ receiverId: 'nonexistent' });
    expect(res.status).toBe(404);
  });

  test('409 — already matched', async () => {
    const app = buildApp();
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildChain({ data: { id: 'user-2' }, error: null }); // receiver found
      if (callCount === 2) return buildChain({ data: { id: 'match-1' }, error: null }); // existing match
      return buildChain({ data: null, error: null });
    });
    const res = await request(app)
      .post('/api/matches/request')
      .set('Authorization', `Bearer ${makeToken('user-1')}`)
      .send({ receiverId: 'user-2' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already matched/i);
  });

  test('201 — new match request created successfully', async () => {
    const app = buildApp();
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildChain({ data: { id: 'user-2' }, error: null }); // receiver exists
      if (callCount === 2) return buildChain({ data: null, error: null });              // no existing match
      if (callCount === 3) return buildChain({ data: null, error: null });              // no existing request
      return buildChain({ data: { id: 'req-1' }, error: null });                       // new request
    });
    const res = await request(app)
      .post('/api/matches/request')
      .set('Authorization', `Bearer ${makeToken('user-1')}`)
      .send({ receiverId: 'user-2' });
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/sent/i);
    expect(res.body).toHaveProperty('requestId');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/matches/requests', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 — no token', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/matches/requests');
    expect(res.status).toBe(401);
  });

  test('200 — returns incoming and outgoing arrays', async () => {
    const app = buildApp();
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      const chain = buildChain({ data: [], error: null });
      // Override the terminal .then to return array properly
      chain.then = (resolve) => Promise.resolve({ data: [], error: null }).then(resolve);
      return chain;
    });

    const res = await request(app)
      .get('/api/matches/requests')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('incoming');
    expect(res.body).toHaveProperty('outgoing');
    expect(Array.isArray(res.body.incoming)).toBe(true);
    expect(Array.isArray(res.body.outgoing)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/matches/respond', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 — no token', async () => {
    const app = buildApp();
    const res = await request(app).put('/api/matches/respond').send({ requestId: '1', action: 'accept' });
    expect(res.status).toBe(401);
  });

  test('400 — invalid action', async () => {
    const app = buildApp();
    const res = await request(app)
      .put('/api/matches/respond')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ requestId: 'req-1', action: 'ignore' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/accept|reject/i);
  });

  test('404 — request not found', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: null, error: { message: 'Not found' } })
    );
    const res = await request(app)
      .put('/api/matches/respond')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ requestId: 'req-1', action: 'accept' });
    expect(res.status).toBe(404);
  });

  test('200 — reject returns success message', async () => {
    const app = buildApp();
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return buildChain({ data: { id: 'req-1', sender_id: 'user-2', receiver_id: 'user-1', status: 'pending' }, error: null });
      return buildChain({ data: {}, error: null }); // update
    });
    const res = await request(app)
      .put('/api/matches/respond')
      .set('Authorization', `Bearer ${makeToken('user-1')}`)
      .send({ requestId: 'req-1', action: 'reject' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/rejected/i);
  });

  test('200 — accept creates a match and returns matchId', async () => {
    const app = buildApp();
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return buildChain({ data: { id: 'req-1', sender_id: 'user-2', receiver_id: 'user-1', status: 'pending' }, error: null });
      if (callCount === 2) return buildChain({ data: {}, error: null }); // update request
      return buildChain({ data: { id: 'match-99' }, error: null });       // insert match
    });
    const res = await request(app)
      .put('/api/matches/respond')
      .set('Authorization', `Bearer ${makeToken('user-1')}`)
      .send({ requestId: 'req-1', action: 'accept' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('matchId', 'match-99');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/matches', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 — no token', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/matches');
    expect(res.status).toBe(401);
  });

  test('200 — returns shaped matches array', async () => {
    const app = buildApp();
    const rawMatches = [
      {
        id: 'match-1',
        created_at: '2024-01-01T00:00:00Z',
        user1: { id: 'user-1', name: 'Alice', avatar_url: null, city: '', country: '', bio: '', interests: [], points: 0 },
        user2: { id: 'user-2', name: 'Bob', avatar_url: null, city: '', country: '', bio: '', interests: [], points: 0 },
      },
    ];
    supabase.from.mockImplementation(() =>
      buildChain({ data: rawMatches, error: null })
    );

    const res = await request(app)
      .get('/api/matches')
      .set('Authorization', `Bearer ${makeToken('user-1')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.matches)).toBe(true);
    expect(res.body.matches[0].user.name).toBe('Bob');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/matches/:matchId', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 — no token', async () => {
    const app = buildApp();
    const res = await request(app).delete('/api/matches/match-1');
    expect(res.status).toBe(401);
  });

  test('404 — match not found', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: null, error: { message: 'Not found' } })
    );
    const res = await request(app)
      .delete('/api/matches/nonexistent')
      .set('Authorization', `Bearer ${makeToken('user-1')}`);
    expect(res.status).toBe(404);
  });

  test('403 — user not part of match', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: { id: 'match-1', user1_id: 'user-A', user2_id: 'user-B' }, error: null })
    );
    const res = await request(app)
      .delete('/api/matches/match-1')
      .set('Authorization', `Bearer ${makeToken('user-outsider')}`);
    expect(res.status).toBe(403);
  });

  test('200 — successful unmatch', async () => {
    const app = buildApp();
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return buildChain({ data: { id: 'match-1', user1_id: 'user-1', user2_id: 'user-2' }, error: null });
      return buildChain({ data: {}, error: null }); // delete + cleanup
    });
    const res = await request(app)
      .delete('/api/matches/match-1')
      .set('Authorization', `Bearer ${makeToken('user-1')}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/unmatched/i);
  });
});
