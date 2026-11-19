import { describe, it, expect } from 'vitest';
import { assertJwtSecret, JWT_SECRET_MIN_LENGTH } from './auth.constants.js';

const short = 'a'.repeat(JWT_SECRET_MIN_LENGTH - 1);
const long = 'a'.repeat(JWT_SECRET_MIN_LENGTH);

describe('assertJwtSecret', () => {
  it('requires at least 32 characters', () => {
    expect(JWT_SECRET_MIN_LENGTH).toBe(32);
  });

  it('throws in production when the secret is too short', () => {
    expect(() => assertJwtSecret(short, 'production')).toThrow(
      /JWT_SECRET must be at least 32 characters/
    );
  });

  it('returns the secret in production when it is long enough', () => {
    expect(assertJwtSecret(long, 'production')).toBe(long);
  });

  it.each(['development', 'test', undefined])(
    'accepts a short secret when NODE_ENV is %s',
    (nodeEnv) => {
      expect(assertJwtSecret(short, nodeEnv)).toBe(short);
    }
  );
});
