import { setupTestDatabase } from './db.js';

/** Runs once before the integration suite: create + migrate the test database. */
export default async function setup(): Promise<void> {
  await setupTestDatabase();
}
