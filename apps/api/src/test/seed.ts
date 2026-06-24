/**
 * Seed helpers for integration tests (arrange step).
 *
 * Two creation paths, on purpose:
 *   - createUser() goes through the real POST /auth/register route, so the JWT
 *     and the welcome document it returns are produced exactly as in production.
 *   - createDocument() inserts directly via SQL (see note on that function).
 */
import request from 'supertest';
import { createApp } from '../app.js';
import { getTestPool } from './db.js';

const app = createApp();

export interface SeededUser {
  id: string;
  email: string;
  displayName: string | null;
  /** Valid access token for authHeader(). */
  token: string;
}

let userSeq = 0;

/**
 * Register a user through the real /auth/register route and return the created
 * user plus a valid JWT. Note: registration also seeds a welcome document, so a
 * freshly-created user already owns one document.
 */
export async function createUser(overrides?: {
  email?: string;
  password?: string;
  displayName?: string;
}): Promise<SeededUser> {
  // email and password get fallbacks because registration requires both (the
  // route 400s without them) and email is unique, so a fixed value would
  // collide on reuse. displayName has no fallback on purpose: it is nullable in
  // the domain (route stores `displayName || null`), so omitting it yields a
  // valid user with displayName: null. Tests that care pass the override.
  const email =
    overrides?.email ?? `user-${++userSeq}-${Date.now()}@test.local`;
  const password = overrides?.password ?? 'password123';

  const res = await request(app)
    .post('/auth/register')
    .send({ email, password, displayName: overrides?.displayName });

  if (res.status !== 201) {
    throw new Error(
      `createUser: register returned ${res.status}: ${JSON.stringify(res.body)}`
    );
  }

  return {
    id: res.body.user.id,
    email: res.body.user.email,
    displayName: res.body.user.displayName,
    token: res.body.token,
  };
}

/** Authorization header for a seeded user, e.g. request(app).get(...).set(authHeader(user)). */
export function authHeader(user: Pick<SeededUser, 'token'>): {
  Authorization: string;
} {
  return { Authorization: `Bearer ${user.token}` };
}

export interface SeededDocument {
  id: string;
  userId: string;
  title: string;
}

let docSeq = 0;

/**
 * Insert a document for `user` directly via SQL rather than through the
 * GraphQL API. Rationale:
 *   - The test pool connects as the table owner, and the documents table uses
 *     ENABLE (not FORCE) row-level security, so an owner insert bypasses RLS.
 *     This makes setup fast and deterministic regardless of the current user.
 *   - It keeps test *arrange* independent of the create_document mutation: a
 *     break in that mutation shouldn't fail unrelated tests during setup.
 * Tests that need to assert RLS or insert behaviour exercise the real API in
 * their own bodies instead.
 */
export async function createDocument(
  user: Pick<SeededUser, 'id'>,
  overrides?: { title?: string }
): Promise<SeededDocument> {
  const n = ++docSeq;
  const title = overrides?.title ?? `Test Document ${n}`;

  const { rows } = await getTestPool().query<{ id: string }>(
    `INSERT INTO documents (user_id, title)
     VALUES ($1, $2) RETURNING id`,
    [user.id, title]
  );

  return { id: rows[0].id, userId: user.id, title };
}
