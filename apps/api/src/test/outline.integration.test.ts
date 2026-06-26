/**
 * Outline SQL-function mutations exercised through GraphQL:
 * create_node (document / folder / separator, word count, document→folder
 * promotion, separator guard) and move_and_reorder_node (reparent + reorder,
 * promotion, cycle guard, separator guard).
 */
import { describe, expect, it } from 'vitest';
import { getTestPool } from './db.js';
import { graphql } from './graphql.js';
import { createUser, type SeededUser } from './seed.js';

const richText = (text: string) => [{ type: 'p', children: [{ text }] }];

const CREATE_NODE = `
  mutation ($kind: String, $parentId: UUID, $title: String, $content: JSON) {
    createNode(
      input: {
        nodeKind: $kind
        nodeParentId: $parentId
        nodeTitle: $title
        nodeContent: $content
      }
    ) {
      document {
        id
        title
        kind
        status
        parentId
        position
        wordCount
      }
    }
  }
`;

interface NodeResult {
  id: string;
  title: string;
  kind: string;
  status: string | null;
  parentId: string | null;
  position: number;
  wordCount: number;
}

async function makeNode(
  user: SeededUser,
  vars: {
    kind?: string;
    parentId?: string;
    title?: string;
    content?: unknown;
  } = {}
) {
  const res = await graphql<{ createNode: { document: NodeResult } }>(
    CREATE_NODE,
    vars,
    user.token
  );
  expect(res.errors).toBeUndefined();
  return res.data!.createNode.document;
}

async function dbKind(id: string): Promise<string> {
  const { rows } = await getTestPool().query<{ kind: string }>(
    'SELECT kind FROM documents WHERE id = $1',
    [id]
  );
  return rows[0].kind;
}

describe('create_node', () => {
  it('creates a document with a computed word count', async () => {
    const user = await createUser();
    const doc = await makeNode(user, {
      kind: 'document',
      title: 'My First Doc',
      content: richText('one two three'),
    });

    expect(doc.kind).toBe('document');
    expect(doc.wordCount).toBe(3);
    expect(doc.parentId).toBeNull();
    expect(doc.status).toBeNull();
  });

  it('counts empty content as zero words', async () => {
    const user = await createUser();
    const doc = await makeNode(user, { title: 'Blank', content: [] });
    expect(doc.wordCount).toBe(0);
  });

  it('creates a folder', async () => {
    const user = await createUser();
    const folder = await makeNode(user, { kind: 'folder', title: 'Part One' });
    expect(folder.kind).toBe('folder');
  });

  it('creates a separator', async () => {
    const user = await createUser();
    const sep = await makeNode(user, { kind: 'separator', title: 'Act II' });
    expect(sep.kind).toBe('separator');
  });

  it('promotes a document to a folder when something is nested inside it', async () => {
    const user = await createUser();
    const parent = await makeNode(user, { kind: 'document', title: 'Chapter' });
    expect(parent.kind).toBe('document');

    await makeNode(user, {
      kind: 'document',
      parentId: parent.id,
      title: 'Scene',
    });

    expect(await dbKind(parent.id)).toBe('folder');
  });

  it('rejects adding inside a separator', async () => {
    const user = await createUser();
    const sep = await makeNode(user, { kind: 'separator', title: 'Break' });

    const res = await graphql(
      CREATE_NODE,
      { kind: 'document', parentId: sep.id, title: 'Nope' },
      user.token
    );
    expect(res.errors).toBeDefined();

    const { rowCount } = await getTestPool().query(
      'SELECT 1 FROM documents WHERE parent_id = $1',
      [sep.id]
    );
    expect(rowCount).toBe(0);
  });

  it('assigns increasing positions within a sibling group', async () => {
    const user = await createUser();
    const first = await makeNode(user, { title: 'First' });
    const second = await makeNode(user, { title: 'Second' });
    expect(second.position).toBeGreaterThan(first.position);
  });
});

const MOVE = `
  mutation ($nodeId: UUID!, $targetParentId: UUID, $nodePositions: JSON!) {
    moveAndReorderNode(
      input: {
        nodeId: $nodeId
        targetParentId: $targetParentId
        nodePositions: $nodePositions
      }
    ) {
      clientMutationId
    }
  }
`;

async function dbParent(id: string): Promise<string | null> {
  const { rows } = await getTestPool().query<{ parent_id: string | null }>(
    'SELECT parent_id FROM documents WHERE id = $1',
    [id]
  );
  return rows[0].parent_id;
}

describe('move_and_reorder_node', () => {
  it('moves a node under a target and reorders the sibling group', async () => {
    const user = await createUser();
    const folder = await makeNode(user, { kind: 'folder', title: 'Folder' });
    const doc = await makeNode(user, { title: 'Doc' });

    const res = await graphql(
      MOVE,
      {
        nodeId: doc.id,
        targetParentId: folder.id,
        nodePositions: [{ id: doc.id, position: 0 }],
      },
      user.token
    );
    expect(res.errors).toBeUndefined();
    expect(await dbParent(doc.id)).toBe(folder.id);
  });

  it('promotes a document target parent to a folder', async () => {
    const user = await createUser();
    const target = await makeNode(user, { kind: 'document', title: 'Target' });
    const moved = await makeNode(user, { title: 'Moved' });

    await graphql(
      MOVE,
      {
        nodeId: moved.id,
        targetParentId: target.id,
        nodePositions: [{ id: moved.id, position: 0 }],
      },
      user.token
    );
    expect(await dbKind(target.id)).toBe('folder');
  });

  it('rejects moving a node into its own subtree', async () => {
    const user = await createUser();
    const folder = await makeNode(user, { kind: 'folder', title: 'Outer' });
    const child = await makeNode(user, { parentId: folder.id, title: 'Inner' });

    const res = await graphql(
      MOVE,
      {
        nodeId: folder.id,
        targetParentId: child.id,
        nodePositions: [],
      },
      user.token
    );
    expect(res.errors).toBeDefined();
    expect(await dbParent(folder.id)).toBeNull();
  });

  it('rejects moving a node inside a separator', async () => {
    const user = await createUser();
    const sep = await makeNode(user, { kind: 'separator', title: 'Sep' });
    const doc = await makeNode(user, { title: 'Doc' });

    const res = await graphql(
      MOVE,
      {
        nodeId: doc.id,
        targetParentId: sep.id,
        nodePositions: [{ id: doc.id, position: 0 }],
      },
      user.token
    );
    expect(res.errors).toBeDefined();
    expect(await dbParent(doc.id)).toBeNull();
  });
});

// move_and_reorder_node enforces the parent invariants, but PostGraphile also
// exposes the generic updateDocumentById, through which a client could patch
// parent_id directly and bypass the function. The documents_check_parent
// trigger must hold the line on every write path.
const PATCH_PARENT = `
  mutation ($id: UUID!, $parentId: UUID) {
    updateDocumentById(
      input: { id: $id, documentPatch: { parentId: $parentId } }
    ) {
      document { id }
    }
  }
`;

describe('parent_id integrity trigger (updateDocumentById bypass path)', () => {
  it('rejects a cycle created via a direct parent patch', async () => {
    const user = await createUser();
    const folder = await makeNode(user, { kind: 'folder', title: 'Outer' });
    const child = await makeNode(user, { parentId: folder.id, title: 'Inner' });

    const res = await graphql(
      PATCH_PARENT,
      { id: folder.id, parentId: child.id },
      user.token
    );
    expect(res.errors).toBeDefined();
    expect(await dbParent(folder.id)).toBeNull();
  });

  it('rejects nesting under a separator via a direct parent patch', async () => {
    const user = await createUser();
    const sep = await makeNode(user, { kind: 'separator', title: 'Sep' });
    const doc = await makeNode(user, { title: 'Doc' });

    const res = await graphql(
      PATCH_PARENT,
      { id: doc.id, parentId: sep.id },
      user.token
    );
    expect(res.errors).toBeDefined();
    expect(await dbParent(doc.id)).toBeNull();
  });

  it('rejects making a node its own parent via a direct parent patch', async () => {
    const user = await createUser();
    const doc = await makeNode(user, { title: 'Doc' });

    const res = await graphql(
      PATCH_PARENT,
      { id: doc.id, parentId: doc.id },
      user.token
    );
    expect(res.errors).toBeDefined();
    expect(await dbParent(doc.id)).toBeNull();
  });
});
