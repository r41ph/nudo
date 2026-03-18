import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { hashPassword, comparePassword, signToken, verifyToken } from './utils.js';

vi.mock('bcrypt');

describe('hashPassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls bcrypt.hash with the password and 10 salt rounds', async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    const result = await hashPassword('mypassword');
    expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 10);
    expect(result).toBe('hashed-password');
  });
});

describe('comparePassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when password matches the hash', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    expect(await comparePassword('correct', 'hash')).toBe(true);
  });

  it('returns false when password does not match the hash', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    expect(await comparePassword('wrong', 'hash')).toBe(false);
  });
});

describe('signToken', () => {
  it('returns a three-part JWT string', () => {
    const token = signToken({ userId: 'user-1', email: 'a@b.com' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('encodes userId and email in the payload', () => {
    const token = signToken({ userId: 'user-1', email: 'a@b.com' });
    const decoded = jwt.decode(token) as { userId: string; email: string };
    expect(decoded.userId).toBe('user-1');
    expect(decoded.email).toBe('a@b.com');
  });
});

describe('verifyToken', () => {
  it('returns the decoded payload for a valid token', () => {
    const token = signToken({ userId: 'user-1', email: 'a@b.com' });
    const result = verifyToken(token);
    expect(result).toMatchObject({ userId: 'user-1', email: 'a@b.com' });
  });

  it('returns null for a completely invalid token', () => {
    expect(verifyToken('not-a-token')).toBeNull();
  });

  it('returns null for a tampered signature', () => {
    const token = signToken({ userId: 'user-1', email: 'a@b.com' });
    const tampered = token.slice(0, -4) + 'XXXX';
    expect(verifyToken(tampered)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(verifyToken('')).toBeNull();
  });
});
