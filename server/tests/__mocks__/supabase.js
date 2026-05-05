/**
 * Manual mock for ../config/supabase
 * Provides a chainable query-builder mock so route handlers can be tested
 * without a real database connection.
 *
 * Usage pattern in each test file:
 *   jest.mock('../../config/supabase');
 *   const supabase = require('../../config/supabase');
 *   supabase.from.mockReturnValue({ ... });
 */

const buildChain = (result = { data: null, error: null }) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
    // Allow awaiting the chain itself
    then: (resolve) => Promise.resolve(result).then(resolve),
  };
  return chain;
};

const supabase = {
  from: jest.fn(() => buildChain()),
  storage: {
    listBuckets: jest.fn().mockResolvedValue({ data: [{ name: 'avatars' }] }),
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: { path: 'test/path.jpg' }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } }),
      remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
    createBucket: jest.fn().mockResolvedValue({ data: {}, error: null }),
  },
};

module.exports = supabase;
