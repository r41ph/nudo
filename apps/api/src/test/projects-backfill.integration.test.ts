// After 024 public.documents.project_id is NOT NULL, so pre-024 rows can only
// exist in a scratch copy. backfill_projects() uses unqualified names, which
// resolve against this session's search_path.
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getTestPool } from './db.js';

const SCHEMA = 'backfill_scratch';

describe('backfill_projects', () => {
  let client: pg.PoolClient;
  const users: Record<'withFolders' | 'withNesting' | 'empty', string> = {
    withFolders: '',
    withNesting: '',
    empty: '',
  };

  async function insertUser(email: string): Promise<string> {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash) VALUES ($1, 'x') RETURNING id`,
      [email]
    );
    return rows[0].id;
  }

  async function insertNode(
    userId: string,
    kind: string,
    parentId: string | null = null
  ): Promise<string> {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO documents (user_id, kind, parent_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [userId, kind, parentId]
    );
    return rows[0].id;
  }

  beforeAll(async () => {
    client = await getTestPool().connect();
    await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await client.query(`CREATE SCHEMA ${SCHEMA}`);
    // ADD COLUMN IF NOT EXISTS + DROP NOT NULL let the copy be built the
    // same way before and after 024 has added the column.
    await client.query(`
      CREATE TABLE ${SCHEMA}.users (LIKE public.users INCLUDING DEFAULTS);
      CREATE TABLE ${SCHEMA}.projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        title text NOT NULL DEFAULT 'Untitled manuscript',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE ${SCHEMA}.documents (LIKE public.documents INCLUDING DEFAULTS);
      ALTER TABLE ${SCHEMA}.documents ADD COLUMN IF NOT EXISTS project_id uuid;
      ALTER TABLE ${SCHEMA}.documents ALTER COLUMN project_id DROP NOT NULL;
    `);
    await client.query(`SET search_path TO ${SCHEMA}`);

    users.withFolders = await insertUser('folders@test.local');
    const chapter = await insertNode(users.withFolders, 'folder');
    await insertNode(users.withFolders, 'document', chapter);
    await insertNode(users.withFolders, 'separator');
    await insertNode(users.withFolders, 'document');

    users.withNesting = await insertUser('nesting@test.local');
    const part = await insertNode(users.withNesting, 'folder');
    const nested = await insertNode(users.withNesting, 'folder', part);
    await insertNode(users.withNesting, 'document', nested);

    users.empty = await insertUser('empty@test.local');

    await client.query('SELECT public.backfill_projects()');
  });

  afterAll(async () => {
    if (!client) return;
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    } finally {
      // The session's search_path must not leak back into the pool.
      client.release(true);
    }
  });

  it('gives every document a project owned by its own user', async () => {
    const { rows } = await client.query<{
      user_id: string;
      project_owner: string | null;
    }>(
      `SELECT d.user_id, p.user_id AS project_owner
         FROM documents d LEFT JOIN projects p ON p.id = d.project_id`
    );

    expect(rows).toHaveLength(7);
    for (const row of rows) {
      expect(row.project_owner).toBe(row.user_id);
    }
  });

  it('creates exactly one "Untitled manuscript" per user, including users with no documents', async () => {
    const { rows } = await client.query<{ user_id: string; title: string }>(
      'SELECT user_id, title FROM projects'
    );

    expect(rows.map((r) => r.user_id).sort()).toEqual(
      Object.values(users).sort()
    );
    for (const row of rows) {
      expect(row.title).toBe('Untitled manuscript');
    }
  });

  it('touches nothing outside the scratch schema', async () => {
    const { rows } = await client.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM public.projects'
    );
    expect(rows[0].count).toBe(0);
  });
});
