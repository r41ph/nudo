import './config/env.js';

import express, { type Express } from 'express';
import cors from 'cors';

import { authRouter } from './auth/routes.js';
import { authMiddleware } from './auth/middleware.js';
import { postgraphileMiddleware } from './config/postgraphile.js';

// No port binding here so integration tests can mount it with supertest.
export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: (process.env.FRONTEND_URL || 'http://localhost:5173').split(','),
      credentials: true,
    })
  );
  app.use('/auth', express.json(), authRouter);

  app.use(authMiddleware);

  // PostGraphile parses its own body; a global express.json() would consume it first.
  app.use(postgraphileMiddleware);

  return app;
}
