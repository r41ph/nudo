/**
 * Migration Wrapper for node-pg-migrate
 * ======================================
 *
 * This file intentionally wraps `node-pg-migrate` instead of calling it
 * directly from package.json.
 *
 * Although `node-pg-migrate` can be run via CLI (e.g. `npx node-pg-migrate up`),
 * we use this wrapper to guarantee consistent, safe, and monorepo-aware
 * execution.
 *
 * WHY THIS EXISTS
 * ----------------
 *
 * 1. Explicit DATABASE_URL Control
 *    - We import DATABASE_URL from our application config.
 *    - This prevents relying purely on .env resolution.
 *    - Reduces risk of accidentally running migrations against
 *      the wrong database.
 *
 * 2. TypeScript Migration Support
 *    - Our migrations are written in TypeScript.
 *    - We pass `--migration-file-language ts`.
 *    - We inject `NODE_OPTIONS='--import tsx'` so Node can execute
 *      TS files without precompiling.
 *    - Removing this wrapper may break TS migrations.
 *
 * 3. Monorepo Stability
 *    - Ensures consistent working directory.
 *    - Locks migration path to `src/db/migrations`.
 *    - Locks env path to `../../.env`.
 *    - Prevents "works on my machine" issues.
 *
 * 4. Forward-Only Policy
 *    - Migrations are forward-only — there is no `down` direction.
 *    - To revert a schema change, write a new migration that reverses it.
 *    - Any positional argument passed to this script is ignored, with a
 *      warning so callers know the forward-only policy is in effect.
 *
 * If refactoring or removing this file, ensure:
 * - DATABASE_URL remains explicitly controlled.
 * - TypeScript migrations still execute correctly.
 * - Monorepo paths remain stable.
 * - CI/CD behavior remains unchanged.
 */

import { execSync } from 'child_process';
import { DATABASE_URL } from '../config/db.js';

if (process.argv[2]) {
  console.warn(
    `Ignoring argument "${process.argv[2]}" — migrations are forward-only.`
  );
}

const cmd = `DATABASE_URL="${DATABASE_URL}" npx node-pg-migrate --migration-file-language ts --envPath ../../.env -m src/db/migrations up`;

console.info('Running migrations...');
execSync(cmd, {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_OPTIONS: '--import tsx',
  },
});
