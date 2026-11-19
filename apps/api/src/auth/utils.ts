import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { JWT_EXPIRES_IN, JWT_SECRET } from '@api/constants/auth.constants.js';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface TokenUser {
  userId: string;
  email: string;
}

export interface TokenClaims extends TokenUser {
  // Absent on tokens issued before the refresh cap; `/graphql` still accepts
  // those until they expire, `/auth/refresh` doesn't.
  authTime?: number;
  exp: number;
}

export function signToken({ userId, email }: TokenUser): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ userId, email, authTime: now, iat: now }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);
}

// Reuses the login's exp so refreshing never outlives the original session.
export function refreshToken({
  userId,
  email,
  authTime,
  exp,
}: Required<TokenClaims>): string {
  return jwt.sign({ userId, email, authTime, exp }, JWT_SECRET);
}

export function verifyToken(token: string): TokenClaims | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenClaims;
  } catch {
    return null;
  }
}
