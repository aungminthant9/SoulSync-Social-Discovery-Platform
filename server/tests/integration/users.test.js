/**
 * Integration Tests — /api/users routes
 *
 * Covers:
 *   GET  /api/users/me         — fetch own profile
 *   PUT  /api/users/me         — update profile
 *   GET  /api/users/:id        — fetch another user's public profile
 *   DELETE /api/users/me       — delete own account
 */

process.env.JWT_SECRET = 'test-secret-key';
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

jest.mock('../../config/supabase');
const supabase = require('../../config/supabase');

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: {
        listUsers: jest.fn().mockResolvedValue({ data: { users: [] } }),
        deleteUser: jest.fn().mockResolvedValue({}),
      },
    },
    storage: { listBuckets: jest.fn().mockResolvedValue({ data: [{ name: 'avatars' }] }) },
    from: jest.fn(),
  })),
}));

const jwt = require('jsonwebtoken');
const express = require('express');
const request = require('supertest');
const usersRouter = require('../../routes/users');

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeToken = (payload = { id: 'user-1', email: 'alice@example.com' }) =>
  jwt.sign(payload, 'test-secret-key', { expiresIn: '1h' });

const buildChain = (result) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
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
  app.use('/api/users', usersRouter);
  return app;
};

const mockUser = {
  id: 'user-1',
  name: 'Alice',
  email: 'alice@example.com',
  dob: '1990-06-15',
  gender: 'female',
  city: 'Yangon',
  country: 'Myanmar',
  bio: 'Hello!',
  interests: ['music'],
  avatar_url: null,
  credits: 100,
  points: 50,
  is_blurred: false,
  is_admin: false,
  is_suspended: false,
  is_banned: false,
  warnings_count: 0,
  created_at: '2024-01-01T00:00:00Z',
};

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/users/me', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 — no token provided', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  test('200 — returns own profile with total_credits_spent', async () => {
    const app = buildApp();
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return buildChain({ data: mockUser, error: null });
      // gift_transactions query
      return buildChain({ data: [], error: null });
    });

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user).toHaveProperty('total_credits_spent');
  });

  test('404 — user not found in DB', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: null, error: { message: 'No rows' } })
    );

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/users/me', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 — no token', async () => {
    const app = buildApp();
    const res = await request(app).put('/api/users/me').send({ name: 'Bob' });
    expect(res.status).toBe(401);
  });

  test('400 — no fields to update', async () => {
    const app = buildApp();
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({}); // empty body
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No fields/i);
  });

  test('200 — successfully updates profile', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: { ...mockUser, name: 'Alice Updated' }, error: null })
    );

    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Alice Updated', bio: 'New bio' });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Alice Updated');
    expect(res.body.message).toMatch(/updated/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/users/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 — no token', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/users/user-2');
    expect(res.status).toBe(401);
  });

  test('404 — user not found', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: null, error: { message: 'Not found' } })
    );

    const res = await request(app)
      .get('/api/users/nonexistent-id')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });

  test('200 — returns public profile with computed age', async () => {
    const app = buildApp();
    const publicUser = {
      id: 'user-2',
      name: 'Bob',
      dob: '1995-01-01',
      gender: 'male',
      city: 'Bangkok',
      country: 'Thailand',
      bio: 'Hi',
      interests: [],
      avatar_url: null,
      points: 200,
      is_blurred: false,
      created_at: '2024-01-01T00:00:00Z',
    };

    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildChain({ data: publicUser, error: null });
      return buildChain({ data: [], error: null }); // gift_transactions
    });

    const res = await request(app)
      .get('/api/users/user-2')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('age');
    expect(res.body.user.age).toBeGreaterThanOrEqual(29);
  });

  test('200 — blurred profile hides private data for other users', async () => {
    const app = buildApp();
    const blurredUser = {
      id: 'user-3',
      name: 'Hidden',
      dob: '1995-01-01',
      city: 'Secret City',
      country: 'Hidden Land',
      bio: 'Private bio',
      interests: ['private'],
      avatar_url: null,
      points: 0,
      is_blurred: true,
      created_at: '2024-01-01T00:00:00Z',
    };

    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildChain({ data: blurredUser, error: null });
      return buildChain({ data: [], error: null });
    });

    const res = await request(app)
      .get('/api/users/user-3')
      .set('Authorization', `Bearer ${makeToken({ id: 'user-1', email: 'x@x.com' })}`);

    expect(res.status).toBe(200);
    expect(res.body.user.city).toBe('***');
    expect(res.body.user.bio).toMatch(/private/i);
    expect(res.body.user.is_blurred).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/users/me', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 — no token', async () => {
    const app = buildApp();
    const res = await request(app).delete('/api/users/me');
    expect(res.status).toBe(401);
  });

  test('200 — successful account deletion', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: {}, error: null })
    );
    supabase.storage.from.mockReturnValue({
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
      remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
    });

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});
