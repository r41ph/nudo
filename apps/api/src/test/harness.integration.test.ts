import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { getTestPool } from './db.js';

const app = createApp();

describe('integration harness', () => {
  it('boots the app against the test database', async () => {
    const res = await request(app).get('/graphiql');
    expect(res.status).toBe(200);
  });

  it('starts each test with an empty database', async () => {
    const { rows } = await getTestPool().query<{ count: number }>(
      'SELECT count(*)::int FROM users'
    );
    expect(rows[0].count).toBe(0);
  });
});
