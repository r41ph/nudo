import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response, NextFunction } from 'express';
import { authMiddleware, type AuthRequest } from './middleware.js';
import { signToken } from './utils.js';

function mockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

const mockNext = vi.fn() as unknown as NextFunction;

beforeEach(() => vi.clearAllMocks());

describe('authMiddleware', () => {
  it('sets req.userId from a valid Bearer token and continues', () => {
    const token = signToken({ userId: 'user-42', email: 'x@y.com' });
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as AuthRequest;
    const res = mockResponse();

    authMiddleware(req, res, mockNext);

    expect(req.userId).toBe('user-42');
    expect(mockNext).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('continues anonymously when no Authorization header is present', () => {
    const req = { headers: {} } as AuthRequest;
    const res = mockResponse();

    authMiddleware(req, res, mockNext);

    expect(req.userId).toBeUndefined();
    expect(mockNext).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('continues anonymously for non-Bearer schemes', () => {
    const req = {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    } as AuthRequest;
    const res = mockResponse();

    authMiddleware(req, res, mockNext);

    expect(req.userId).toBeUndefined();
    expect(mockNext).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects a present-but-invalid Bearer token with 401 and does not continue', () => {
    const req = {
      headers: { authorization: 'Bearer invalid.token.here' },
    } as AuthRequest;
    const res = mockResponse();

    authMiddleware(req, res, mockNext);

    expect(req.userId).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid or expired token',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
