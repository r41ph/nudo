import './config/env.js';

import express from 'express';
import cors from 'cors';

import { authRouter } from './auth/routes.js';
import { authMiddleware } from './auth/middleware.js';
import { postgraphileMiddleware } from './config/postgraphile.js';

const app = express();
const port = parseInt(process.env.API_PORT || '3001', 10);

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

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
  console.log(`GraphiQL available at http://localhost:${port}/graphiql`);
});
