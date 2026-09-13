import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { JWT_SECRET } from '@api/constants/auth.constants.js';
import { createApp } from '../app.js';
import { createUser } from '../test/seed.js';
import { verifyToken } from './utils.js';

const app = createApp();

describe('POST /auth/register', () => {
  it('creates a user and returns a token', async () => {
    const email = `register-${Date.now()}@test.local`;
    const res = await request(app)
      .post('/auth/register')
      .send({ email, password: 'password123', displayName: 'Reg' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ email, displayName: 'Reg' });
    expect(res.body.user.id).toBeTruthy();
  });

  it('rejects missing credentials with 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'no-password@test.local' });

    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email with 409', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/auth/register')
      .send({ email: user.email, password: 'password123' });

    expect(res.status).toBe(409);
  });
});

describe('POST /auth/login', () => {
  it('returns a token for valid credentials', async () => {
    const user = await createUser({ password: 'secret123' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: user.email, password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.id).toBe(user.id);
  });

  it('rejects a wrong password with 401', async () => {
    const user = await createUser({ password: 'secret123' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: user.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@test.local', password: 'whatever' });

    expect(res.status).toBe(401);
  });

  it('rejects missing credentials with 400', async () => {
    const res = await request(app).post('/auth/login').send({});

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/refresh', () => {
  it('issues a valid token from a valid token', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(verifyToken(res.body.token)).toMatchObject({
      userId: user.id,
      email: user.email,
    });
  });

  it('rejects a missing token with 401', async () => {
    const res = await request(app).post('/auth/refresh');

    expect(res.status).toBe(401);
  });

  it('rejects an expired token with 401', async () => {
    const user = await createUser();
    // Negative expiresIn => exp is already in the past, so verify() rejects it.
    const expired = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: -10 }
    );

    const res = await request(app)
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('returns 204 and clears site data', async () => {
    const res = await request(app).post('/auth/logout');

    expect(res.status).toBe(204);
    expect(res.headers['clear-site-data']).toBeTruthy();
  });
});
