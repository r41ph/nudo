/**
 * SQL-function mutations for folders, exercised through GraphQL:
 * create_new_folder, reorder_folders, and move_and_reorder_document.
 */
import { describe, expect, it } from 'vitest';
import { getTestPool } from './db.js';
import { graphql } from './graphql.js';
import { createDocument, createUser, type SeededUser } from './seed.js';

/** Create a folder through the create_new_folder mutation. */
async function makeFolder(user: SeededUser, name: string) {
  const res = await graphql<{
    createNewFolder: { folder: { id: string; name: string; position: number } };
  }>(
    `
      mutation ($name: String!) {
        createNewFolder(input: { folderName: $name }) {
          folder {
            id
            name
            position
          }
        }
      }
    `,
    { name },
    user.token
  );
  expect(res.errors).toBeUndefined();
  return res.data!.createNewFolder.folder;
}

describe('create_new_folder', () => {
  it('creates a folder with the given name and a numeric position', async () => {
    const user = await createUser();
    const folder = await makeFolder(user, 'Drafts');

    expect(folder.name).toBe('Drafts');
    expect(typeof folder.position).toBe('number');

    const { rowCount } = await getTestPool().query(
      'SELECT 1 FROM folders WHERE id = $1',
      [folder.id]
    );
    expect(rowCount).toBe(1);
  });
});

describe('reorder_folders', () => {
  it('updates folder positions in a batch', async () => {
    const user = await createUser();
    const a = await makeFolder(user, 'A');
    const b = await makeFolder(user, 'B');

    const res = await graphql(
      `
        mutation ($positions: JSON!) {
          reorderFolders(input: { folderPositions: $positions }) {
            clientMutationId
          }
        }
      `,
      {
        positions: [
          { id: a.id, position: 1 },
          { id: b.id, position: 0 },
        ],
      },
      user.token
    );

    expect(res.errors).toBeUndefined();
    const { rows } = await getTestPool().query<{
      id: string;
      position: number;
    }>('SELECT id, position FROM folders WHERE id = ANY($1)', [[a.id, b.id]]);
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.position]));
    expect(byId[a.id]).toBe(1);
    expect(byId[b.id]).toBe(0);
  });
});

describe('move_and_reorder_document', () => {
  it('moves a document into a target folder', async () => {
    const user = await createUser();
    const folder = await makeFolder(user, 'Folder');
    const doc = await createDocument(user); // starts at root (folder_id null)

    const res = await graphql(
      `
        mutation ($docId: UUID!, $targetFolderId: UUID, $docPositions: JSON!) {
          moveAndReorderDocument(
            input: {
              docId: $docId
              targetFolderId: $targetFolderId
              docPositions: $docPositions
            }
          ) {
            clientMutationId
          }
        }
      `,
      {
        docId: doc.id,
        targetFolderId: folder.id,
        docPositions: [{ id: doc.id, position: 0 }],
      },
      user.token
    );

    expect(res.errors).toBeUndefined();
    const { rows } = await getTestPool().query<{ folder_id: string | null }>(
      'SELECT folder_id FROM documents WHERE id = $1',
      [doc.id]
    );
    expect(rows[0].folder_id).toBe(folder.id);
  });
});
