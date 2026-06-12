import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from './utils.js';

export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Extracts the authenticated user from a Bearer token.
 *
 * Three cases, deliberately distinct:
 *   - No / non-Bearer Authorization header: anonymous request, continues with
 *     no userId (RLS then yields no rows — correct for genuinely public access).
 *   - Bearer token present but invalid/expired: rejected with 401. A presented
 *     credential that fails verification is an authentication failure, not
 *     anonymous access — surfacing it lets the client clear the stale token and
 *     re-authenticate instead of silently seeing an empty (unauthenticated) view.
 *   - Valid Bearer token: sets req.userId for downstream RLS.
 */
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    req.userId = decoded.userId;
  }
  next();
}
