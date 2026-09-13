import { execSync } from 'node:child_process';
import path from 'node:path';
import pg from 'pg';
import { requireEnv } from '../config/env.js';

export const TEST_DB_NAME = 'nudo_test';

// node-pg-migrate's bookkeeping table; preserved so we migrate once, not per test.
const MIGRATIONS_TABLE = 'pgmigrations';

const apiRoot = path.resolve(import.meta.dirname, '..', '..');

function baseConfig() {
  return {
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
  };
}

let pool: pg.Pool | undefined;

export function getTestPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ ...baseConfig(), database: TEST_DB_NAME });
  }
  return pool;
}

export async function closeTestPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

export async function ensureTestDatabase(): Promise<void> {
  // CREATE DATABASE can't run inside the target DB.
  const client = new pg.Client({ ...baseConfig(), database: 'postgres' });
  await client.connect();
  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [TEST_DB_NAME]
    );
    if (!rowCount) {
      // Identifiers can't be parameterised; TEST_DB_NAME is a fixed constant.
      await client.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    }
  } finally {
    await client.end();
  }
}

// dotenv won't override an already-set var, so DB_NAME in the child env wins.
export function migrateTestDatabase(): void {
  execSync('pnpm migrate', {
    cwd: apiRoot,
    stdio: 'inherit',
    env: { ...process.env, DB_NAME: TEST_DB_NAME },
  });
}

export async function setupTestDatabase(): Promise<void> {
  await ensureTestDatabase();
  migrateTestDatabase();
}

export async function truncateAll(): Promise<void> {
  const p = getTestPool();
  const { rows } = await p.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> $1`,
    [MIGRATIONS_TABLE]
  );
  if (rows.length === 0) return;
  const tables = rows.map((r) => `"${r.tablename}"`).join(', ');
  await p.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}
