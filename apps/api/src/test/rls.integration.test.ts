/**
 * Row-level security isolation: user B must never read, update, or delete data
 * owned by user A through the GraphQL API.
 *
 * These are the highest-risk tests in the suite — a regression here is a
 * cross-tenant data leak. Each assertion is written so that disabling the
 * relevant RLS policy (e.g. ALTER TABLE documents DISABLE ROW LEVEL SECURITY)
 * makes the test fail: reads would return the row, and writes would mutate it.
 *
 * Ground truth is read via the test pool (owner connection, bypasses RLS) so we
 * observe the real database state regardless of how PostGraphile reports a
 * blocked write (null payload vs. error).
 */
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { getTestPool } from './db.js';
import { graphql } from './graphql.js';
import { createDocument, createUser, type SeededUser } from './seed.js';

let userA: SeededUser;
let userB: SeededUser;

beforeEach(async () => {
  userA = await createUser();
  userB = await createUser();
});

describe('RLS: documents', () => {
  it('user B cannot read user A document', async () => {
    const doc = await createDocument(userA, { title: 'A secret' });

    const res = await graphql<{ documentById: { id: string } | null }>(
      `
        query ($id: UUID!) {
          documentById(id: $id) {
            id
            title
          }
        }
      `,
      { id: doc.id },
      userB.token
    );

    expect(res.data?.documentById).toBeNull();
  });

  it('user B cannot update user A document', async () => {
    const doc = await createDocument(userA, { title: 'Original' });

    await graphql(
      `
        mutation ($id: UUID!, $title: String!) {
          updateDocumentById(
            input: { id: $id, documentPatch: { title: $title } }
          ) {
            document {
              id
              title
            }
          }
        }
      `,
      { id: doc.id, title: 'Hijacked' },
      userB.token
    );

    const { rows } = await getTestPool().query<{ title: string }>(
      'SELECT title FROM documents WHERE id = $1',
      [doc.id]
    );
    expect(rows[0].title).toBe('Original');
  });

  it('user B cannot delete user A document', async () => {
    const doc = await createDocument(userA);

    await graphql(
      `
        mutation ($id: UUID!) {
          deleteDocumentById(input: { id: $id }) {
            deletedDocumentId
          }
        }
      `,
      { id: doc.id },
      userB.token
    );

    const { rowCount } = await getTestPool().query(
      'SELECT 1 FROM documents WHERE id = $1',
      [doc.id]
    );
    expect(rowCount).toBe(1);
  });
});

describe('RLS: folders', () => {
  async function createFolder(user: SeededUser, name = 'A folder') {
    const { rows } = await getTestPool().query<{ id: string }>(
      'INSERT INTO folders (user_id, name) VALUES ($1, $2) RETURNING id',
      [user.id, name]
    );
    return rows[0].id;
  }

  it('user B cannot read user A folder', async () => {
    const folderId = await createFolder(userA, 'A secret folder');

    const res = await graphql<{ folderById: { id: string } | null }>(
      `
        query ($id: UUID!) {
          folderById(id: $id) {
            id
            name
          }
        }
      `,
      { id: folderId },
      userB.token
    );

    expect(res.data?.folderById).toBeNull();
  });

  it('user B cannot update user A folder', async () => {
    const folderId = await createFolder(userA, 'Original');

    await graphql(
      `
        mutation ($id: UUID!, $name: String!) {
          updateFolderById(input: { id: $id, folderPatch: { name: $name } }) {
            folder {
              id
              name
            }
          }
        }
      `,
      { id: folderId, name: 'Hijacked' },
      userB.token
    );

    const { rows } = await getTestPool().query<{ name: string }>(
      'SELECT name FROM folders WHERE id = $1',
      [folderId]
    );
    expect(rows[0].name).toBe('Original');
  });

  it('user B cannot delete user A folder', async () => {
    const folderId = await createFolder(userA);

    await graphql(
      `
        mutation ($id: UUID!) {
          deleteFolderById(input: { id: $id }) {
            deletedFolderId
          }
        }
      `,
      { id: folderId },
      userB.token
    );

    const { rowCount } = await getTestPool().query(
      'SELECT 1 FROM folders WHERE id = $1',
      [folderId]
    );
    expect(rowCount).toBe(1);
  });
});

describe('RLS: discussions', () => {
  // Discussions are scoped through the owning document, so seed A's document
  // first, then attach a discussion to it.
  async function createDiscussion(owner: SeededUser) {
    const doc = await createDocument(owner);
    const id = randomUUID();
    await getTestPool().query(
      'INSERT INTO discussions (id, document_id, user_id) VALUES ($1, $2, $3)',
      [id, doc.id, owner.id]
    );
    return id;
  }

  it('user B cannot create a discussion on user A document', async () => {
    // Discussions are created via a raw mutation where the client supplies the
    // documentId, so B can attempt to attach one to A's document. The
    // discussions_insert WITH CHECK (document_id must belong to the caller)
    // is what blocks it.
    const doc = await createDocument(userA);

    await graphql(
      `
        mutation ($id: UUID!, $documentId: UUID!, $userId: UUID!) {
          createDiscussion(
            input: {
              discussion: { id: $id, documentId: $documentId, userId: $userId }
            }
          ) {
            discussion {
              id
            }
          }
        }
      `,
      { id: randomUUID(), documentId: doc.id, userId: userB.id },
      userB.token
    );

    const { rowCount } = await getTestPool().query(
      'SELECT 1 FROM discussions WHERE document_id = $1',
      [doc.id]
    );
    expect(rowCount).toBe(0);
  });

  it('user B cannot read user A discussion', async () => {
    const id = await createDiscussion(userA);

    const res = await graphql<{ discussionById: { id: string } | null }>(
      `
        query ($id: UUID!) {
          discussionById(id: $id) {
            id
            isResolved
          }
        }
      `,
      { id },
      userB.token
    );

    expect(res.data?.discussionById).toBeNull();
  });

  it('user B cannot update user A discussion', async () => {
    const id = await createDiscussion(userA);

    await graphql(
      `
        mutation ($id: UUID!) {
          updateDiscussionById(
            input: { id: $id, discussionPatch: { isResolved: true } }
          ) {
            discussion {
              id
              isResolved
            }
          }
        }
      `,
      { id },
      userB.token
    );

    const { rows } = await getTestPool().query<{ is_resolved: boolean }>(
      'SELECT is_resolved FROM discussions WHERE id = $1',
      [id]
    );
    expect(rows[0].is_resolved).toBe(false);
  });

  it('user B cannot delete user A discussion', async () => {
    const id = await createDiscussion(userA);

    await graphql(
      `
        mutation ($id: UUID!) {
          deleteDiscussionById(input: { id: $id }) {
            deletedDiscussionId
          }
        }
      `,
      { id },
      userB.token
    );

    const { rowCount } = await getTestPool().query(
      'SELECT 1 FROM discussions WHERE id = $1',
      [id]
    );
    expect(rowCount).toBe(1);
  });
});
