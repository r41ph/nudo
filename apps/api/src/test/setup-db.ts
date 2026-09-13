// The suite's globalSetup does the same; this exists for explicit use, e.g. CI.
import { closeTestPool, setupTestDatabase } from './db.js';

await setupTestDatabase();
await closeTestPool();
