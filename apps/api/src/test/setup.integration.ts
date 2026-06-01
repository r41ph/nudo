import { afterAll, beforeEach } from 'vitest';
import { closeTestPool, truncateAll } from './db.js';

// Each test starts from a clean database.
beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closeTestPool();
});
