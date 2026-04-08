import { describe, it, expect } from 'vitest';
import { isValidUuid } from '@web/shared/lib/uuid';

describe('isValidUuid', () => {
  it('returns true for a valid lowercase UUID', () => {
    expect(isValidUuid('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
  });

  it('returns true for a valid uppercase UUID', () => {
    expect(isValidUuid('A1B2C3D4-E5F6-7890-ABCD-EF1234567890')).toBe(true);
  });

  it('returns true for a mixed-case UUID', () => {
    expect(isValidUuid('a1B2c3D4-e5F6-7890-AbCd-eF1234567890')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidUuid('')).toBe(false);
  });

  it('returns false for a random string', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
  });

  it('returns false for a UUID missing a section', () => {
    expect(isValidUuid('a1b2c3d4-e5f6-7890-abcd')).toBe(false);
  });

  it('returns false for a UUID with extra characters', () => {
    expect(isValidUuid('a1b2c3d4-e5f6-7890-abcd-ef1234567890x')).toBe(false);
  });

  it('returns false for a UUID with invalid hex characters', () => {
    expect(isValidUuid('g1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(false);
  });
});
