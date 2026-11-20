import './config/env.js';

import express, { type ErrorRequestHandler, type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import { authRouter } from './auth/routes.js';
import { authMiddleware } from './auth/middleware.js';
import { postgraphileMiddleware } from './config/postgraphile.js';
import {
  AUTH_RATE_LIMIT,
  AUTH_RATE_LIMIT_WINDOW_MS,
  BODY_SIZE_LIMIT,
  type AuthRateLimit,
} from './constants/auth.constants.js';
import { TRUST_PROXY_HOPS } from './constants/server.constants.js';

export interface CreateAppOptions {
  authRateLimit?: Partial<AuthRateLimit>;
  trustProxyHops?: number;
}

function authLimiter(limit: number) {
  return rateLimit({
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  });
}

// Express's default handler prints the stack whenever NODE_ENV isn't production.
const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const type = (err as { type?: unknown }).type;
  if (type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Malformed JSON body' });
    return;
  }
  if (type === 'entity.too.large') {
    res.status(413).json({ error: 'Request body too large' });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
};

// No port binding here so integration tests can mount it with supertest.
export function createApp(options: CreateAppOptions = {}): Express {
  const authRateLimit = { ...AUTH_RATE_LIMIT, ...options.authRateLimit };
  const app = express();
  // req.ip, and so the per-client rate limits, come from X-Forwarded-For only
  // for this many proxy hops.
  app.set('trust proxy', options.trustProxyHops ?? TRUST_PROXY_HOPS);

  // Every response is JSON, but outside production GraphiQL is served from
  // this app and a CSP would block it.
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production'
          ? { useDefaults: false, directives: { defaultSrc: ["'none'"] } }
          : false,
    })
  );
  app.use(
    cors({
      origin: (process.env.FRONTEND_URL || 'http://localhost:5173').split(','),
      credentials: true,
    })
  );

  // Built per app, so each test app starts with empty counters. After cors so
  // preflight requests aren't counted.
  app.use('/auth/login', authLimiter(authRateLimit.login));
  app.use('/auth/register', authLimiter(authRateLimit.login));
  app.use('/auth/refresh', authLimiter(authRateLimit.refresh));
  app.use('/auth', express.json({ limit: BODY_SIZE_LIMIT }), authRouter);

  app.use(authMiddleware);

  // PostGraphile parses its own body; a global express.json() would consume it first.
  app.use(postgraphileMiddleware);

  app.use(errorHandler);

  return app;
}
