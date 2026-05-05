/**
 * Unit Tests — age & field validation helpers extracted from routes/auth.js
 *
 * We test the pure logic (age calculation, required field checks) directly,
 * independently from Express and Supabase, to give fast, reliable feedback.
 */

// ── Age computation (mirrors the logic in POST /register) ─────────────────────
function computeAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// ── Required-field check (mirrors the check in POST /register) ────────────────
function validateRegistrationFields({ name, email, password, dob, gender }) {
  return !name || !email || !password || !dob || !gender
    ? 'All required fields must be provided.'
    : null;
}

describe('Auth Route — pure helper logic (unit)', () => {
  // ── Age computation ──────────────────────────────────────────────────────────
  describe('computeAge()', () => {
    test('returns correct age for a person clearly over 18', () => {
      const dob = '1990-01-01';
      expect(computeAge(dob)).toBeGreaterThanOrEqual(34);
    });

    test('returns 17 for someone born exactly 17 years ago today', () => {
      const today = new Date();
      // birthday = exactly 17 years ago
      const dob = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate())
        .toISOString()
        .slice(0, 10);
      expect(computeAge(dob)).toBe(17);
    });

    test('returns 18 for someone born exactly 18 years ago today', () => {
      const today = new Date();
      const dob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
        .toISOString()
        .slice(0, 10);
      expect(computeAge(dob)).toBe(18);
    });

    test('handles boundary — someone born Dec 31 is still 17 on Dec 30 of their 18th year', () => {
      // Fix today to Dec 30 of a specific year to avoid UTC/timezone flakiness
      // Dec 31 birthday, checked on Dec 30 → still 17
      const realToday = global.Date;
      const fixedToday = new Date(2025, 11, 30); // Dec 30 2025 (month is 0-indexed)
      jest.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) return fixedToday;
        return new realToday(...args);
      });

      const dob = '2007-12-31'; // turns 18 on Dec 31 2025, but today is Dec 30
      expect(computeAge(dob)).toBe(17);

      jest.restoreAllMocks();
    });
  });

  // ── Required-field validation ────────────────────────────────────────────────
  describe('validateRegistrationFields()', () => {
    const validFields = {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret123',
      dob: '2000-01-01',
      gender: 'female',
    };

    test('returns null when all required fields are provided', () => {
      expect(validateRegistrationFields(validFields)).toBeNull();
    });

    test.each(['name', 'email', 'password', 'dob', 'gender'])(
      'returns error message when %s is missing',
      (field) => {
        const incomplete = { ...validFields, [field]: '' };
        expect(validateRegistrationFields(incomplete)).toBe(
          'All required fields must be provided.'
        );
      }
    );

    test('returns error when all fields are missing', () => {
      expect(validateRegistrationFields({})).toBe('All required fields must be provided.');
    });
  });
});
