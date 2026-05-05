/**
 * Integration Tests — POST /api/auth/register
 *                     POST /api/auth/login
 *                     POST /api/auth/forgot-password
 *                     POST /api/auth/reset-password
 *
 * External dependencies (Supabase, bcrypt heavy work) are mocked so tests
 * run fast and deterministically without a real database.
 */

process.env.JWT_SECRET = 'test-secret-key';
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
process.env.CLIENT_URL = 'http://localhost:3000';

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../../config/supabase');
const supabase = require('../../config/supabase');

// Mock the Supabase admin client created inside auth.js
jest.mock('@supabase/supabase-js', () => {
  const createClient = jest.fn(() => ({
    auth: {
      admin: {
        createUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-uid-1' } }, error: null }),
        deleteUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
        generateLink: jest.fn().mockResolvedValue({ error: null }),
        listUsers: jest.fn().mockResolvedValue({ data: { users: [] } }),
      },
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'auth-uid-1', email: 'test@soulsync.com' } },
        error: null,
      }),
    },
    from: jest.fn(),
    storage: { listBuckets: jest.fn().mockResolvedValue({ data: [] }) },
  }));
  return { createClient };
});

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('$2a$12$salt'),
  hash: jest.fn().mockResolvedValue('$2a$12$hashedpassword'),
  compare: jest.fn(),
}));

const bcrypt = require('bcryptjs');

// ── App setup ─────────────────────────────────────────────────────────────────
const express = require('express');
const request = require('supertest');

const authRouter = require('../../routes/auth');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
};

// ── Helper: configure supabase.from to return a fresh chainable mock ──────────
const buildChain = (result) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue(result),
  maybeSingle: jest.fn().mockResolvedValue(result),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  const validBody = {
    name: 'Alice',
    email: 'alice@example.com',
    password: 'password123',
    dob: '1990-06-15',
    gender: 'female',
    city: 'Yangon',
    country: 'Myanmar',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: email not already taken
    supabase.from.mockImplementation(() =>
      buildChain({ data: null, error: null })
    );
  });

  test('400 — missing required field (name)', async () => {
    const app = buildApp();
    const { name, ...body } = validBody;
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('403 — user under 18 years old', async () => {
    const app = buildApp();
    // Born today minus 16 years
    const today = new Date();
    const dob = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate())
      .toISOString()
      .slice(0, 10);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validBody, dob });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/18/);
  });

  test('409 — email already exists in DB', async () => {
    const app = buildApp();
    // Return an existing user row
    supabase.from.mockImplementation(() =>
      buildChain({ data: { id: 'existing-id' }, error: null })
    );
    const res = await request(app).post('/api/auth/register').send(validBody);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  test('201 — successful registration returns token and user', async () => {
    const app = buildApp();
    // First call (check existing): no user
    // Second call (insert): new user
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildChain({ data: null, error: null });
      return buildChain({
        data: { id: 'new-user-id', name: 'Alice', email: 'alice@example.com', avatar_url: null, credits: 0, points: 0 },
        error: null,
      });
    });

    const res = await request(app).post('/api/auth/register').send(validBody);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ email: 'alice@example.com' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  const validCredentials = { email: 'alice@example.com', password: 'password123' };
  const mockUser = {
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    password_hash: '$2a$12$hashedpassword',
    avatar_url: null,
    credits: 100,
    points: 50,
    is_banned: false,
    is_suspended: false,
    warnings_count: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('400 — missing email or password', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('401 — user not found in DB', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: null, error: { message: 'Not found' } })
    );
    const res = await request(app).post('/api/auth/login').send(validCredentials);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid email or password/i);
  });

  test('403 — banned user cannot log in', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: { ...mockUser, is_banned: true }, error: null })
    );
    const res = await request(app).post('/api/auth/login').send(validCredentials);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_BANNED');
  });

  test('401 — wrong password', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: mockUser, error: null })
    );
    bcrypt.compare.mockResolvedValue(false);
    const res = await request(app).post('/api/auth/login').send(validCredentials);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid email or password/i);
  });

  test('200 — successful login returns token and user without password_hash', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: mockUser, error: null })
    );
    bcrypt.compare.mockResolvedValue(true);
    const res = await request(app).post('/api/auth/login').send(validCredentials);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).not.toHaveProperty('password_hash');
    expect(res.body.user.email).toBe('alice@example.com');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => jest.clearAllMocks());

  test('400 — missing email', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/forgot-password').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Email.*required/i);
  });

  test('200 — unknown email still returns generic success (anti-enumeration)', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: null, error: null })
    );
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if an account/i);
  });

  test('200 — known email returns generic success message', async () => {
    const app = buildApp();
    supabase.from.mockImplementation(() =>
      buildChain({ data: { id: 'user-1', email: 'alice@example.com' }, error: null })
    );
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'alice@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if an account/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => jest.clearAllMocks());

  test('400 — missing access_token or password', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ access_token: 'tok' }); // password missing
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('400 — password shorter than 8 characters', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ access_token: 'tok', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  test('200 — successful password reset', async () => {
    const app = buildApp();
    // supabase.from for update call
    supabase.from.mockImplementation(() =>
      buildChain({ data: {}, error: null })
    );
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ access_token: 'valid-token', password: 'newpassword123' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);
  });
});
