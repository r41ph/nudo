// Wraps node-pg-migrate instead of calling its CLI from package.json so that:
// DATABASE_URL comes from app config, not ambient .env resolution; TypeScript
// migrations run via `--import tsx`; the migrations and env paths are pinned
// for the monorepo; and migrations stay forward-only (any `down` argument is
// ignored with a warning — revert by writing a new migration).

import { execSync } from 'child_process';
import { DATABASE_URL } from '../config/db.js';

if (process.argv[2]) {
  console.warn(
    `Ignoring argument "${process.argv[2]}" — migrations are forward-only.`
  );
}

const cmd = `DATABASE_URL="${DATABASE_URL}" npx node-pg-migrate --migration-file-language ts --envPath ../../.env -m src/db/migrations up`;

// eslint-disable-next-line no-console -- CLI script; its output is the UI
console.info('Running migrations...');
execSync(cmd, {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_OPTIONS: '--import tsx',
  },
});
