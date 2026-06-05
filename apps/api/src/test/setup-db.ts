/**
 * Standalone CLI for `pnpm test:db:setup` — create + migrate the test database.
 * The integration suite also does this via globalSetup; this is for explicit
 * use (e.g. a CI step before running tests).
 */
import { closeTestPool, setupTestDatabase } from './db.js';

await setupTestDatabase();
await closeTestPool();
