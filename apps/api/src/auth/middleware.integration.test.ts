/**
 * authMiddleware gates every request reaching PostGraphile. These tests drive
 * the real /graphql endpoint (supertest) to prove the three credential cases
 * end-to-end against the test database.
 */
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
    // createUser registers through /auth/register, which seeds a welcome doc.
    const user = await createUser();

    const res = await request(app)
      .post('/graphql')
      .set(authHeader(user))
      .send({ query: ALL_DOCUMENTS });

    expect(res.status).toBe(200);
    const nodes = res.body.data.allDocuments.nodes;
    expect(nodes).toHaveLength(1);
    expect(nodes[0].title).toBe('Welcome Document');
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
    // No Authorization header: RLS yields no rows because app.current_user_id
    // is unset. This must stay distinct from the 401 invalid-token case.
    const res = await request(app)
      .post('/graphql')
      .send({ query: ALL_DOCUMENTS });

    expect(res.status).toBe(200);
    expect(res.body.data.allDocuments.nodes).toHaveLength(0);
  });
});
