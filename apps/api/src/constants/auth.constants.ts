import type { Secret } from 'jsonwebtoken';
import { requireEnv } from '../config/env.js';

export const JWT_SECRET: Secret = requireEnv('JWT_SECRET');
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
