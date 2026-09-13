import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { JWT_SECRET } from '@api/constants/auth.constants.js';
import { createApp } from '../app.js';
import { createUser, authHeader } from '../test/seed.js';

const app = createApp();

const ALL_DOCUMENTS = `{ allDocuments { nodes { id title } } }`;

describe('authMiddleware on /graphql', () => {
  it('returns the authenticated user documents with a valid token', async () => {
    // Registration seeds "Chapter One" holding the "Welcome Document".
    const user = await createUser();

    const res = await request(app)
      .post('/graphql')
      .set(authHeader(user))
      .send({ query: ALL_DOCUMENTS });

    expect(res.status).toBe(200);
    const nodes = res.body.data.allDocuments.nodes;
    const titles = nodes.map((n: { title: string }) => n.title);
    expect(titles).toEqual(
      expect.arrayContaining(['Chapter One', 'Welcome Document'])
    );
  });

  it('rejects a present-but-invalid Bearer token with 401', async () => {
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({ query: ALL_DOCUMENTS });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('rejects an expired token with 401', async () => {
    const user = await createUser();
    const expired = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: -10 }
    );

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${expired}`)
      .send({ query: ALL_DOCUMENTS });

    expect(res.status).toBe(401);
  });

  it('treats a request with no token as anonymous (no rows, not an error)', async () => {
    // Anonymous must stay distinct from the 401 invalid-token case.
    const res = await request(app)
      .post('/graphql')
      .send({ query: ALL_DOCUMENTS });

    expect(res.status).toBe(200);
    expect(res.body.data.allDocuments.nodes).toHaveLength(0);
  });
});
