/**
 * SQL-function mutations for user toolbar settings and discussion pruning,
 * exercised through GraphQL: update_user_toolbar and prune_orphaned_discussions.
 */
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { getTestPool } from './db.js';
import { graphql } from './graphql.js';
import { createDocument, createUser } from './seed.js';

describe('update_user_toolbar', () => {
  it('updates the enabled tools and toolbar type for the current user', async () => {
    const user = await createUser();

    const res = await graphql<{
      updateUserToolbar: {
        user: { enabledTools: string[]; toolbarType: string };
      };
    }>(
      `
        mutation ($enabledTools: JSON!, $toolbarType: String) {
          updateUserToolbar(
            input: {
              newEnabledTools: $enabledTools
              newToolbarType: $toolbarType
            }
          ) {
            user {
              id
              enabledTools
              toolbarType
            }
          }
        }
      `,
      { enabledTools: ['bold', 'underline'], toolbarType: 'fixed' },
      user.token
    );

    expect(res.errors).toBeUndefined();
    expect(res.data?.updateUserToolbar.user.enabledTools).toEqual([
      'bold',
      'underline',
    ]);
    expect(res.data?.updateUserToolbar.user.toolbarType).toBe('fixed');
  });
});

describe('prune_orphaned_discussions', () => {
  it('deletes discussions on the document that are not in the active set', async () => {
    const user = await createUser();
    const doc = await createDocument(user);
    const keep = randomUUID();
    const orphan = randomUUID();
    await getTestPool().query(
      `INSERT INTO discussions (id, document_id, user_id)
       VALUES ($1, $2, $3), ($4, $2, $3)`,
      [keep, doc.id, user.id, orphan]
    );

    const res = await graphql(
      `
        mutation ($docId: UUID!, $activeIds: [UUID]!) {
          pruneOrphanedDiscussions(
            input: { docId: $docId, activeIds: $activeIds }
          ) {
            clientMutationId
          }
        }
      `,
      { docId: doc.id, activeIds: [keep] },
      user.token
    );

    expect(res.errors).toBeUndefined();
    const { rows } = await getTestPool().query<{ id: string }>(
      'SELECT id FROM discussions WHERE document_id = $1',
      [doc.id]
    );
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(keep);
    expect(ids).not.toContain(orphan);
  });
});
