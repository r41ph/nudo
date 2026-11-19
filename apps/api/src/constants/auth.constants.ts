import type { Secret } from 'jsonwebtoken';
import { requireEnv } from '../config/env.js';

export const JWT_SECRET_MIN_LENGTH = 32;

// Production only, so dev .env files and the CI placeholder keep working.
export function assertJwtSecret(
  value: string,
  nodeEnv: string | undefined
): string {
  if (nodeEnv === 'production' && value.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters in production`
    );
  }
  return value;
}

export const JWT_SECRET: Secret = assertJwtSecret(
  requireEnv('JWT_SECRET'),
  process.env.NODE_ENV
);
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
