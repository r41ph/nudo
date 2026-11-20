import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JWT_SECRET } from '#api/constants/auth.constants.js';
import { createApp, type CreateAppOptions } from './app.js';
import { createUser } from './test/seed.js';
import { TEST_APP_OPTIONS } from './test/test.constants.js';

const LOW_LIMIT = 2;
const OVERSIZED = 'x'.repeat(200 * 1024);
const STACK_FRAME = /\bat \S+/;
const HOUR_MS = 60 * 60 * 1000;
const CLIENT_A = '203.0.113.1';
const CLIENT_B = '203.0.113.2';

function lowLimitApp(options: CreateAppOptions = {}) {
  return createApp({
    ...options,
    authRateLimit: { login: LOW_LIMIT, refresh: LOW_LIMIT },
  });
}

function post(
  app: ReturnType<typeof createApp>,
  path: string,
  forwardedFor?: string
): request.Test {
  const req = request(app).post(path);
  return forwardedFor ? req.set('X-Forwarded-For', forwardedFor) : req;
}

async function exhaust(
  app: ReturnType<typeof createApp>,
  path: string,
  forwardedFor?: string
): Promise<request.Response> {
  for (let i = 0; i < LOW_LIMIT; i++) {
    const res = await post(app, path, forwardedFor).send({});
    expect(res.status).not.toBe(429);
  }
  return post(app, path, forwardedFor).send({});
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

  // Behind Dokploy's Traefik every request arrives from the proxy's address;
  // without trust proxy all users would share one limit.
  it('limits each forwarded client separately behind a trusted proxy', async () => {
    const app = lowLimitApp({ trustProxyHops: 1 });
    const limited = await exhaust(app, '/auth/login', CLIENT_A);

    const other = await post(app, '/auth/login', CLIENT_B).send({});

    expect(limited.status).toBe(429);
    expect(other.status).not.toBe(429);
  });

  it('ignores X-Forwarded-For when no proxy is trusted, so it cannot bypass the limit', async () => {
    const app = lowLimitApp();
    await exhaust(app, '/auth/login', CLIENT_A);

    const spoofed = await post(app, '/auth/login', CLIENT_B).send({});

    expect(spoofed.status).toBe(429);
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

describe('refresh cap', () => {
  const app = createApp(TEST_APP_OPTIONS);

  function expOf(token: string): number {
    return (jwt.decode(token) as { exp: number }).exp;
  }

  async function refresh(token: string): Promise<request.Response> {
    return request(app)
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${token}`);
  }

  async function loginToken(): Promise<string> {
    const user = await createUser({ password: 'password123' });
    const res = await request(app)
      .post('/auth/login')
      .send({ email: user.email, password: 'password123' });
    return res.body.token;
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the login exp on a refreshed token, also when refreshed twice', async () => {
    // Only Date is faked so supertest and pg keep their real timers.
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() });
    const login = await loginToken();

    vi.advanceTimersByTime(HOUR_MS);
    const first = await refresh(login);
    vi.advanceTimersByTime(HOUR_MS);
    const second = await refresh(first.body.token);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(expOf(first.body.token)).toBe(expOf(login));
    expect(expOf(second.body.token)).toBe(expOf(login));
  });

  it('rejects a token without authTime with 401', async () => {
    const legacy = jwt.sign(
      { userId: 'user-1', email: 'a@b.com' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await refresh(legacy);

    expect(res.status).toBe(401);
  });
});
