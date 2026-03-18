import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response, NextFunction } from 'express';
import { authMiddleware, type AuthRequest } from './middleware.js';
import { signToken } from './utils.js';

const mockRes = {} as Response;
const mockNext = vi.fn() as unknown as NextFunction;

beforeEach(() => vi.clearAllMocks());

describe('authMiddleware', () => {
  it('always calls next()', () => {
    const req = { headers: {} } as AuthRequest;
    authMiddleware(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledOnce();
  });

  it('sets req.userId from a valid Bearer token', () => {
    const token = signToken({ userId: 'user-42', email: 'x@y.com' });
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as AuthRequest;
    authMiddleware(req, mockRes, mockNext);
    expect(req.userId).toBe('user-42');
    expect(mockNext).toHaveBeenCalledOnce();
  });

  it('does not set req.userId when no Authorization header is present', () => {
    const req = { headers: {} } as AuthRequest;
    authMiddleware(req, mockRes, mockNext);
    expect(req.userId).toBeUndefined();
  });

  it('does not set req.userId for an invalid token', () => {
    const req = {
      headers: { authorization: 'Bearer invalid.token.here' },
    } as AuthRequest;
    authMiddleware(req, mockRes, mockNext);
    expect(req.userId).toBeUndefined();
    expect(mockNext).toHaveBeenCalledOnce();
  });

  it('does not set req.userId for non-Bearer schemes', () => {
    const req = {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    } as AuthRequest;
    authMiddleware(req, mockRes, mockNext);
    expect(req.userId).toBeUndefined();
  });

  it('still calls next() when the token is invalid', () => {
    const req = { headers: { authorization: 'Bearer bad' } } as AuthRequest;
    authMiddleware(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledOnce();
  });
});
