/**
 * Minimal GraphQL client for integration tests: POSTs to /graphql through the
 * in-process app (supertest), optionally authenticated as a seeded user.
 *
 * Unlike createDocument() in seed.ts, this goes through the real PostGraphile
 * stack — role `writing_app_visitor` plus the app.current_user_id derived from
 * the JWT — so it exercises row-level security exactly as the app does.
 */
import request from 'supertest';
import { createApp } from '../app.js';

const app = createApp();

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/** Run a GraphQL operation; pass a token to authenticate as that user. */
export async function graphql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string
): Promise<GraphQLResponse<T>> {
  let req = request(app).post('/graphql');
  if (token) {
    req = req.set('Authorization', `Bearer ${token}`);
  }
  const res = await req.send({ query, variables });
  return res.body as GraphQLResponse<T>;
}
