/**
 * Test database lifecycle helpers (integration tests only).
 *
 * One dedicated `nudo_test` database in the existing Docker Postgres. The flow:
 *   1. ensureTestDatabase() — CREATE DATABASE nudo_test if absent (the normal
 *      migrate flow never creates databases).
 *   2. migrateTestDatabase() — reuse the existing `pnpm migrate` step with
 *      DB_NAME=nudo_test in the child env. run-migrate.ts derives DATABASE_URL
 *      from DB_NAME, and dotenv won't override an already-set var, so the test
 *      DB wins — no change to run-migrate.ts.
 *   3. truncateAll() — reset data tables between tests (the pgmigrations table
 *      is preserved, so we migrate once, not per test).
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import pg from 'pg';
import { requireEnv } from '../config/env.js';

export const TEST_DB_NAME = 'nudo_test';

/** node-pg-migrate's bookkeeping table — never truncated. */
const MIGRATIONS_TABLE = 'pgmigrations';

/** apps/api — cwd for the migrate script. */
const apiRoot = path.resolve(import.meta.dirname, '..', '..');

/** Connection params shared by the maintenance client and the test pool. */
function baseConfig() {
  return {
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
  };
}

let pool: pg.Pool | undefined;

/** Lazily-created pool connected to the test database. */
export function getTestPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ ...baseConfig(), database: TEST_DB_NAME });
  }
  return pool;
}

/** Close the test pool (call once after the whole suite). */
export async function closeTestPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

/** Create the test database if it does not already exist. */
export async function ensureTestDatabase(): Promise<void> {
  // CREATE DATABASE cannot run inside the target DB, so connect to `postgres`.
  const client = new pg.Client({ ...baseConfig(), database: 'postgres' });
  await client.connect();
  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [TEST_DB_NAME]
    );
    if (!rowCount) {
      // Identifier can't be parameterized; TEST_DB_NAME is a fixed constant, so safe.
      await client.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    }
  } finally {
    await client.end();
  }
}

/** Run all migrations against the test database via the existing migrate step. */
export function migrateTestDatabase(): void {
  execSync('pnpm migrate', {
    cwd: apiRoot,
    stdio: 'inherit',
    env: { ...process.env, DB_NAME: TEST_DB_NAME },
  });
}

/** Create (if needed) and migrate the test database. */
export async function setupTestDatabase(): Promise<void> {
  await ensureTestDatabase();
  migrateTestDatabase();
}

/**
 * Empty every data table and reset identity sequences, leaving the schema and
 * the migrations bookkeeping table intact. Run before each test for isolation.
 */
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
