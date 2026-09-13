import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from './utils.js';

export interface AuthRequest extends Request {
  userId?: string;
}

// No token is anonymous (RLS yields no rows), but a token that fails
// verification is a 401, not anonymous: the client needs the signal to clear
// its stale credential instead of silently seeing an empty view.
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
