import request from 'supertest';
import { createApp } from '../app.js';
import { getTestPool } from './db.js';

const app = createApp();

export interface SeededUser {
  id: string;
  email: string;
  displayName: string | null;
  token: string;
}

let userSeq = 0;

// Goes through the real route so the JWT and the seeded welcome document are
// produced exactly as in production.
export async function createUser(overrides?: {
  email?: string;
  password?: string;
  displayName?: string;
}): Promise<SeededUser> {
  // Email is unique, so the fallback must vary; displayName has no fallback
  // because null is a valid domain value.
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

// Raw SQL rather than the API: the owner pool bypasses RLS (ENABLE, not
// FORCE), and a broken create mutation shouldn't fail unrelated tests' setup.
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
