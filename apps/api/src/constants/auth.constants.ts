import type { Secret } from 'jsonwebtoken';

export const JWT_SECRET: Secret = process.env.JWT_SECRET || 'change-me-in-production';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
