// Covers migration 023: the summary/pov columns, their constraints, and the
// column-scoped updated_at trigger. The trigger is the reason the inspector can
// show an honest "Updated" date — updateDocumentById is PostGraphile's generic
// patch and stamps nothing by itself.
import { beforeEach, describe, expect, it } from 'vitest';
import { getTestPool } from './db.js';
import { graphql } from './graphql.js';
import { createDocument, createUser, type SeededUser } from './seed.js';

const UPDATE_DETAILS = `
  mutation ($id: UUID!, $patch: DocumentPatch!) {
    updateDocumentById(input: { id: $id, documentPatch: $patch }) {
      document {
        id
        title
        status
        summary
        pov
        updatedAt
      }
    }
  }
`;

const CREATE_NODE = `
  mutation ($kind: String, $title: String) {
    createNode(input: { nodeKind: $kind, nodeTitle: $title }) {
      document {
        id
        summary
        pov
      }
    }
  }
`;

interface DetailsRow {
  summary: string;
  pov: string;
  updated_at: Date;
}

async function readRow(id: string): Promise<DetailsRow> {
  const { rows } = await getTestPool().query<DetailsRow>(
    'SELECT summary, pov, updated_at FROM documents WHERE id = $1',
    [id]
  );
  return rows[0];
}

// Ages the row so any stamp the trigger makes is unambiguously newer.
async function backdate(id: string): Promise<Date> {
  const { rows } = await getTestPool().query<{ updated_at: Date }>(
    `UPDATE documents SET updated_at = now() - interval '1 day'
      WHERE id = $1 RETURNING updated_at`,
    [id]
  );
  return rows[0].updated_at;
}

async function patch(
  user: SeededUser,
  id: string,
  documentPatch: Record<string, unknown>
) {
  return graphql(UPDATE_DETAILS, { id, patch: documentPatch }, user.token);
}

let user: SeededUser;

beforeEach(async () => {
  user = await createUser();
});

describe('documents.summary / documents.pov', () => {
  it('defaults both to an empty string on create_node', async () => {
    const res = await graphql<{
      createNode: { document: { id: string; summary: string; pov: string } };
    }>(CREATE_NODE, { kind: 'document', title: 'Untitled' }, user.token);

    expect(res.errors).toBeUndefined();
    expect(res.data!.createNode.document.summary).toBe('');
    expect(res.data!.createNode.document.pov).toBe('');
  });

  it('defaults both to an empty string for rows created by registration', async () => {
    const doc = await createDocument(user);

    expect(await readRow(doc.id)).toMatchObject({ summary: '', pov: '' });
  });

  it('round-trips a summary and a pov', async () => {
    const doc = await createDocument(user);

    const res = await patch(user, doc.id, {
      summary: 'Mara reaches the flooded apartment and finds the door open.',
      pov: 'Mara',
    });

    expect(res.errors).toBeUndefined();
    expect(await readRow(doc.id)).toMatchObject({
      summary: 'Mara reaches the flooded apartment and finds the door open.',
      pov: 'Mara',
    });
  });

  // Authors decide how long a synopsis is; no CHECK guards this column.
  it('accepts a 50,000-character summary intact', async () => {
    const doc = await createDocument(user);
    const long = 'a'.repeat(50_000);

    const res = await patch(user, doc.id, { summary: long });

    expect(res.errors).toBeUndefined();
    const row = await readRow(doc.id);
    expect(row.summary).toHaveLength(50_000);
    expect(row.summary).toBe(long);
  });

  it('accepts a pov of exactly 120 characters', async () => {
    const doc = await createDocument(user);
    const name = 'b'.repeat(120);

    const res = await patch(user, doc.id, { pov: name });

    expect(res.errors).toBeUndefined();
    expect((await readRow(doc.id)).pov).toBe(name);
  });

  it('rejects a pov of 121 characters and leaves the row untouched', async () => {
    const doc = await createDocument(user);
    await patch(user, doc.id, { pov: 'Mara' });

    const res = await patch(user, doc.id, { pov: 'c'.repeat(121) });

    expect(res.errors).toBeDefined();
    expect((await readRow(doc.id)).pov).toBe('Mara');
  });
});

describe('documents_touch_updated_at', () => {
  it.each(['title', 'status', 'summary', 'pov'])(
    'advances updated_at when %s is patched',
    async (column) => {
      const doc = await createDocument(user);
      const before = await backdate(doc.id);
      const values: Record<string, string> = {
        title: 'Renamed',
        status: 'drafting',
        summary: 'A synopsis.',
        pov: 'Mara',
      };

      const res = await patch(user, doc.id, { [column]: values[column] });

      expect(res.errors).toBeUndefined();
      expect((await readRow(doc.id)).updated_at.getTime()).toBeGreaterThan(
        before.getTime()
      );
    }
  );

  // Scoped to the four metadata columns on purpose: move_and_reorder_node
  // rewrites position on every sibling, and a blanket trigger would restamp a
  // whole chapter on one drag.
  it('leaves updated_at alone when only position is patched', async () => {
    const doc = await createDocument(user);
    const before = await backdate(doc.id);

    const res = await patch(user, doc.id, { position: 42 });

    expect(res.errors).toBeUndefined();
    expect((await readRow(doc.id)).updated_at.getTime()).toBe(before.getTime());
  });
});

describe('RLS: summary and pov', () => {
  it('user B cannot read user A summary', async () => {
    const userB = await createUser();
    const doc = await createDocument(user);
    await patch(user, doc.id, { summary: 'A secret synopsis' });

    const res = await graphql<{ documentById: { summary: string } | null }>(
      `
        query ($id: UUID!) {
          documentById(id: $id) {
            id
            summary
            pov
          }
        }
      `,
      { id: doc.id },
      userB.token
    );

    expect(res.data?.documentById).toBeNull();
  });

  it('user B cannot patch user A summary', async () => {
    const userB = await createUser();
    const doc = await createDocument(user);
    await patch(user, doc.id, { summary: 'Original' });

    await patch(userB, doc.id, { summary: 'Hijacked' });

    expect((await readRow(doc.id)).summary).toBe('Original');
  });
});
