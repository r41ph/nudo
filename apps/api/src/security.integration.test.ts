import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import { TEST_APP_OPTIONS } from './test/test.constants.js';

const LOW_LIMIT = 2;
const OVERSIZED = 'x'.repeat(200 * 1024);
const STACK_FRAME = /\bat \S+/;

function lowLimitApp() {
  return createApp({
    authRateLimit: { login: LOW_LIMIT, refresh: LOW_LIMIT },
  });
}

async function exhaust(
  app: ReturnType<typeof createApp>,
  path: string
): Promise<request.Response> {
  for (let i = 0; i < LOW_LIMIT; i++) {
    const res = await request(app).post(path).send({});
    expect(res.status).not.toBe(429);
  }
  return request(app).post(path).send({});
}

describe('security headers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ['/auth/login', { email: 'nobody@test.local', password: 'wrong' }],
    ['/graphql', { query: '{ __typename }' }],
  ])('sets helmet headers on %s', async (path, body) => {
    const res = await request(createApp(TEST_APP_OPTIONS))
      .post(path)
      .send(body);

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['referrer-policy']).toBeDefined();
  });

  it('omits the CSP outside production so GraphiQL keeps working', async () => {
    const res = await request(createApp(TEST_APP_OPTIONS))
      .post('/graphql')
      .send({ query: '{ __typename }' });

    expect(res.headers['content-security-policy']).toBeUndefined();
  });

  it("sends CSP default-src 'none' in production", async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await request(createApp(TEST_APP_OPTIONS))
      .post('/graphql')
      .send({ query: '{ __typename }' });

    expect(res.headers['content-security-policy']).toBe("default-src 'none'");
  });
});

describe('auth rate limits', () => {
  it.each(['/auth/login', '/auth/register', '/auth/refresh'])(
    'returns 429 with a JSON error once %s is over the limit',
    async (path) => {
      const res = await exhaust(lowLimitApp(), path);

      expect(res.status).toBe(429);
      expect(res.body).toEqual({ error: expect.any(String) });
    }
  );

  it('counts each auth route separately', async () => {
    const app = lowLimitApp();
    await exhaust(app, '/auth/login');

    const res = await request(app).post('/auth/register').send({});

    expect(res.status).not.toBe(429);
  });
});

describe('body limits and malformed input', () => {
  it('returns 413 for an oversized body on /auth/login', async () => {
    const res = await request(createApp(TEST_APP_OPTIONS))
      .post('/auth/login')
      .send({ email: OVERSIZED, password: 'x' });

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: expect.any(String) });
    expect(res.text).not.toMatch(STACK_FRAME);
  });

  it('returns 413 for an oversized body on /graphql', async () => {
    const res = await request(createApp(TEST_APP_OPTIONS))
      .post('/graphql')
      .send({ query: `{ __typename } # ${OVERSIZED}` });

    expect(res.status).toBe(413);
  });

  it('returns 400 without a stack for malformed JSON on /auth/login', async () => {
    const res = await request(createApp(TEST_APP_OPTIONS))
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
    expect(res.text).not.toMatch(STACK_FRAME);
  });
});
