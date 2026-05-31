import './config/env.js';

import express, { type Express } from 'express';
import cors from 'cors';

import { authRouter } from './auth/routes.js';
import { authMiddleware } from './auth/middleware.js';
import { postgraphileMiddleware } from './config/postgraphile.js';

/**
 * Assembles the Express app without binding a port, so it can be reused by
 * both the server entry point (`index.ts`) and integration tests (supertest).
 */
export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: (process.env.FRONTEND_URL || 'http://localhost:5173').split(','),
      credentials: true,
    })
  );
  // Auth routes need JSON parsing
  app.use('/auth', express.json(), authRouter);

  // JWT extraction for all subsequent routes
  app.use(authMiddleware);

  // PostGraphile (GraphQL) — has its own body parser, don't use express.json() before it
  app.use(postgraphileMiddleware);

  return app;
}
