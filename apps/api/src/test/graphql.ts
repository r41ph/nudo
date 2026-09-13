// Unlike seed.ts's raw inserts, this goes through the real PostGraphile stack
// and so exercises RLS exactly as the app does.
import request from 'supertest';
import { createApp } from '../app.js';

const app = createApp();

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

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
