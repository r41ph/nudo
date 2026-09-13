import { afterAll, beforeEach } from 'vitest';
import { closeTestPool, truncateAll } from './db.js';

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closeTestPool();
});
