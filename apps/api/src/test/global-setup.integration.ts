import { setupTestDatabase } from './db.js';

export default async function setup(): Promise<void> {
  await setupTestDatabase();
}
