/**
 * Unit Tests — middleware/auth.js
 * Tests JWT verification logic in isolation without any HTTP server.
 */

const jwt = require('jsonwebtoken');

// Must be set before requiring the middleware
process.env.JWT_SECRET = 'test-secret-key';

const authMiddleware = require('../../middleware/auth');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authMiddleware — unit tests', () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Missing header ────────────────────────────────────────────────────────────
  test('returns 401 when Authorization header is absent', () => {
    const req = { headers: {} };
    const res = makeRes();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('No token') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when Authorization header does not start with Bearer', () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const res = makeRes();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // ── Invalid / expired token ───────────────────────────────────────────────────
  test('returns 401 for an invalid (tampered) token', () => {
    const req = { headers: { authorization: 'Bearer invalid.token.here' } };
    const res = makeRes();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Invalid or expired') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for an expired token', () => {
    const expiredToken = jwt.sign(
      { id: 'user-1', email: 'a@b.com' },
      'test-secret-key',
      { expiresIn: '-1s' } // already expired
    );
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = makeRes();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // ── Valid token ───────────────────────────────────────────────────────────────
  test('calls next() and sets req.user for a valid token', () => {
    const payload = { id: 'user-abc', email: 'test@soul.com' };
    const token = jwt.sign(payload, 'test-secret-key', { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ id: 'user-abc', email: 'test@soul.com' });
  });

  test('req.user contains id and email from token payload', () => {
    const payload = { id: 'uuid-999', email: 'hello@world.io' };
    const token = jwt.sign(payload, 'test-secret-key');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();

    authMiddleware(req, res, next);

    expect(req.user.id).toBe('uuid-999');
    expect(req.user.email).toBe('hello@world.io');
  });
});
