// Ground truth is read through the owner pool, which bypasses RLS but still
// fires triggers, so raw inserts here exercise documents_check_project too.
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { getTestPool } from './db.js';
import { graphql } from './graphql.js';
import { createUser, type SeededUser } from './seed.js';

const CREATE_PROJECT = `
  mutation ($title: String!) {
    createProject(input: { projectTitle: $title }) {
      project {
        id
        title
      }
    }
  }
`;

const CREATE_NODE = `
  mutation ($projectId: UUID!, $kind: String, $parentId: UUID, $title: String) {
    createNode(
      input: {
        nodeProjectId: $projectId
        nodeKind: $kind
        nodeParentId: $parentId
        nodeTitle: $title
      }
    ) {
      document {
        id
        projectId
        position
      }
    }
  }
`;

const CREATE_DOCUMENT = `
  mutation ($userId: UUID!, $projectId: UUID!, $parentId: UUID, $title: String!) {
    createDocument(
      input: {
        document: {
          userId: $userId
          projectId: $projectId
          parentId: $parentId
          title: $title
        }
      }
    ) {
      document {
        id
      }
    }
  }
`;

const UPDATE_DOCUMENT = `
  mutation ($id: UUID!, $patch: DocumentPatch!) {
    updateDocumentById(input: { id: $id, documentPatch: $patch }) {
      document {
        id
      }
    }
  }
`;

async function insertProject(
  owner: Pick<SeededUser, 'id'>,
  title = 'A project'
): Promise<string> {
  const { rows } = await getTestPool().query<{ id: string }>(
    'INSERT INTO projects (user_id, title) VALUES ($1, $2) RETURNING id',
    [owner.id, title]
  );
  return rows[0].id;
}

async function insertNode(
  owner: Pick<SeededUser, 'id'>,
  projectId: string,
  opts: { kind?: string; parentId?: string; title?: string } = {}
): Promise<string> {
  const { rows } = await getTestPool().query<{ id: string }>(
    `INSERT INTO documents (user_id, project_id, kind, parent_id, title)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [
      owner.id,
      projectId,
      opts.kind ?? 'document',
      opts.parentId ?? null,
      opts.title ?? 'A node',
    ]
  );
  return rows[0].id;
}

async function projectIdOf(documentId: string): Promise<string | undefined> {
  const { rows } = await getTestPool().query<{ project_id: string }>(
    'SELECT project_id FROM documents WHERE id = $1',
    [documentId]
  );
  return rows[0]?.project_id;
}

describe('create_project', () => {
  it('returns the project and seeds "Chapter One" containing "Untitled"', async () => {
    const user = await createUser();

    const res = await graphql<{
      createProject: { project: { id: string; title: string } };
    }>(CREATE_PROJECT, { title: 'The Lamp' }, user.token);

    expect(res.errors).toBeUndefined();
    const project = res.data!.createProject.project;
    expect(project.title).toBe('The Lamp');

    const { rows } = await getTestPool().query<{
      id: string;
      kind: string;
      title: string;
      parent_id: string | null;
      user_id: string;
    }>(
      `SELECT id, kind, title, parent_id, user_id FROM documents
        WHERE project_id = $1 ORDER BY parent_id NULLS FIRST`,
      [project.id]
    );
    expect(rows).toHaveLength(2);
    const [chapter, doc] = rows;
    expect(chapter).toMatchObject({
      kind: 'folder',
      title: 'Chapter One',
      parent_id: null,
      user_id: user.id,
    });
    expect(doc).toMatchObject({
      kind: 'document',
      title: 'Untitled',
      parent_id: chapter.id,
      user_id: user.id,
    });
  });
});

describe('create_node', () => {
  it('puts the node in the given project', async () => {
    const user = await createUser();
    const projectId = await insertProject(user);

    const res = await graphql<{
      createNode: { document: { id: string; projectId: string } };
    }>(CREATE_NODE, { projectId, title: 'Scene' }, user.token);

    expect(res.errors).toBeUndefined();
    expect(res.data!.createNode.document.projectId).toBe(projectId);
    expect(await projectIdOf(res.data!.createNode.document.id)).toBe(projectId);
  });

  it('counts positions per project', async () => {
    const user = await createUser();
    const first = await insertProject(user, 'First');
    const second = await insertProject(user, 'Second');

    const make = async (projectId: string) => {
      const res = await graphql<{
        createNode: { document: { position: number } };
      }>(CREATE_NODE, { projectId, title: 'Node' }, user.token);
      expect(res.errors).toBeUndefined();
      return res.data!.createNode.document.position;
    };

    const a1 = await make(first);
    const a2 = await make(first);
    const b1 = await make(second);

    expect(a2).toBeGreaterThan(a1);
    expect(b1).toBe(a1);
  });

  it("rejects another user's project", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const projectId = await insertProject(owner);

    const res = await graphql(
      CREATE_NODE,
      { projectId, title: 'Planted' },
      intruder.token
    );

    expect(res.errors).toBeDefined();
    const { rowCount } = await getTestPool().query(
      'SELECT 1 FROM documents WHERE project_id = $1',
      [projectId]
    );
    expect(rowCount).toBe(0);
  });
});

describe('documents_check_project trigger', () => {
  it('rejects a parent in another project', async () => {
    const user = await createUser();
    const here = await insertProject(user, 'Here');
    const there = await insertProject(user, 'There');
    const folder = await insertNode(user, there, { kind: 'folder' });

    await expect(
      insertNode(user, here, { parentId: folder })
    ).rejects.toThrow();
  });

  it('rejects a project owned by another user', async () => {
    const owner = await createUser();
    const other = await createUser();
    const projectId = await insertProject(owner);

    await expect(insertNode(other, projectId)).rejects.toThrow();
  });

  it('rejects a project_id change', async () => {
    const user = await createUser();
    const from = await insertProject(user, 'From');
    const to = await insertProject(user, 'To');
    const doc = await insertNode(user, from);

    await expect(
      getTestPool().query(
        'UPDATE documents SET project_id = $1 WHERE id = $2',
        [to, doc]
      )
    ).rejects.toThrow();
    expect(await projectIdOf(doc)).toBe(from);
  });

  it('rejects a cross-project parent through generic createDocument', async () => {
    const user = await createUser();
    const here = await insertProject(user, 'Here');
    const there = await insertProject(user, 'There');
    const folder = await insertNode(user, there, { kind: 'folder' });

    const res = await graphql(
      CREATE_DOCUMENT,
      { userId: user.id, projectId: here, parentId: folder, title: 'Stray' },
      user.token
    );

    expect(res.errors).toBeDefined();
    const { rowCount } = await getTestPool().query(
      'SELECT 1 FROM documents WHERE parent_id = $1',
      [folder]
    );
    expect(rowCount).toBe(0);
  });

  it("rejects another user's project through generic createDocument", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const projectId = await insertProject(owner);

    const res = await graphql(
      CREATE_DOCUMENT,
      { userId: intruder.id, projectId, title: 'Planted' },
      intruder.token
    );

    expect(res.errors).toBeDefined();
    const { rowCount } = await getTestPool().query(
      'SELECT 1 FROM documents WHERE project_id = $1',
      [projectId]
    );
    expect(rowCount).toBe(0);
  });

  it('rejects a project_id change through generic updateDocumentById', async () => {
    const user = await createUser();
    const from = await insertProject(user, 'From');
    const to = await insertProject(user, 'To');
    const doc = await insertNode(user, from);

    const res = await graphql(
      UPDATE_DOCUMENT,
      { id: doc, patch: { projectId: to } },
      user.token
    );

    expect(res.errors).toBeDefined();
    expect(await projectIdOf(doc)).toBe(from);
  });

  it('rejects a cross-project parent through generic updateDocumentById', async () => {
    const user = await createUser();
    const here = await insertProject(user, 'Here');
    const there = await insertProject(user, 'There');
    const doc = await insertNode(user, here);
    const folder = await insertNode(user, there, { kind: 'folder' });

    const res = await graphql(
      UPDATE_DOCUMENT,
      { id: doc, patch: { parentId: folder } },
      user.token
    );

    expect(res.errors).toBeDefined();
    const { rows } = await getTestPool().query<{ parent_id: string | null }>(
      'SELECT parent_id FROM documents WHERE id = $1',
      [doc]
    );
    expect(rows[0].parent_id).toBeNull();
  });
});

describe('RLS: projects', () => {
  it("user B cannot read user A's project", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const projectId = await insertProject(userA);

    const res = await graphql<{
      projectById: { id: string } | null;
      allProjects: { nodes: Array<{ id: string }> };
    }>(
      `
        query ($id: UUID!) {
          projectById(id: $id) {
            id
          }
          allProjects {
            nodes {
              id
            }
          }
        }
      `,
      { id: projectId },
      userB.token
    );

    expect(res.errors).toBeUndefined();
    expect(res.data!.projectById).toBeNull();
    expect(res.data!.allProjects.nodes.map((p) => p.id)).not.toContain(
      projectId
    );
  });

  it("user B cannot rename user A's project", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const projectId = await insertProject(userA, 'Original');

    await graphql(
      `
        mutation ($id: UUID!, $title: String!) {
          updateProjectById(
            input: { id: $id, projectPatch: { title: $title } }
          ) {
            project {
              id
            }
          }
        }
      `,
      { id: projectId, title: 'Hijacked' },
      userB.token
    );

    const { rows } = await getTestPool().query<{ title: string }>(
      'SELECT title FROM projects WHERE id = $1',
      [projectId]
    );
    expect(rows[0].title).toBe('Original');
  });

  it("user B cannot delete user A's project", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const projectId = await insertProject(userA);

    await graphql(
      `
        mutation ($id: UUID!) {
          deleteProjectById(input: { id: $id }) {
            deletedProjectId
          }
        }
      `,
      { id: projectId },
      userB.token
    );

    const { rowCount } = await getTestPool().query(
      'SELECT 1 FROM projects WHERE id = $1',
      [projectId]
    );
    expect(rowCount).toBe(1);
  });

  it("user B cannot add a document to user A's project", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const projectId = await insertProject(userA);

    await graphql(
      CREATE_DOCUMENT,
      { userId: userA.id, projectId, title: 'Planted' },
      userB.token
    );

    const { rowCount } = await getTestPool().query(
      'SELECT 1 FROM documents WHERE project_id = $1',
      [projectId]
    );
    expect(rowCount).toBe(0);
  });
});

describe('deleting a project', () => {
  it('cascades to its documents, versions and discussions', async () => {
    const user = await createUser();
    const projectId = await insertProject(user);
    const doc = await insertNode(user, projectId);

    const update = await graphql(
      `
        mutation ($docId: UUID!, $newContent: JSON!) {
          updateDocumentContent(
            input: { docId: $docId, newContent: $newContent }
          ) {
            document {
              id
            }
          }
        }
      `,
      {
        docId: doc,
        newContent: [{ type: 'p', children: [{ text: 'one two' }] }],
      },
      user.token
    );
    expect(update.errors).toBeUndefined();
    await getTestPool().query(
      'INSERT INTO discussions (id, document_id, user_id) VALUES ($1, $2, $3)',
      [randomUUID(), doc, user.id]
    );

    const res = await graphql(
      `
        mutation ($id: UUID!) {
          deleteProjectById(input: { id: $id }) {
            deletedProjectId
          }
        }
      `,
      { id: projectId },
      user.token
    );
    expect(res.errors).toBeUndefined();

    const pool = getTestPool();
    const counts = await Promise.all([
      pool.query('SELECT 1 FROM projects WHERE id = $1', [projectId]),
      pool.query('SELECT 1 FROM documents WHERE id = $1', [doc]),
      pool.query('SELECT 1 FROM document_versions WHERE document_id = $1', [
        doc,
      ]),
      pool.query('SELECT 1 FROM discussions WHERE document_id = $1', [doc]),
    ]);
    expect(counts.map((c) => c.rowCount)).toEqual([0, 0, 0, 0]);
  });
});

describe('GraphQL schema', () => {
  // create_project and the generic CRUD mutation would both be named
  // createProject; only the function, which seeds the starter tree, may win.
  it('exposes createProject as the function, not the generic insert', async () => {
    const user = await createUser();

    const res = await graphql<{
      __type: { inputFields: Array<{ name: string }> } | null;
    }>(
      `
        {
          __type(name: "CreateProjectInput") {
            inputFields {
              name
            }
          }
        }
      `,
      {},
      user.token
    );

    expect(res.errors).toBeUndefined();
    expect(res.data!.__type).not.toBeNull();
    const fields = res.data!.__type!.inputFields.map((f) => f.name);
    expect(fields).toContain('projectTitle');
    expect(fields).not.toContain('project');
  });
});

describe('sign-up', () => {
  it('seeds one project that holds the welcome tree', async () => {
    const user = await createUser();

    const projects = await getTestPool().query<{ id: string; title: string }>(
      'SELECT id, title FROM projects WHERE user_id = $1',
      [user.id]
    );
    expect(projects.rows).toHaveLength(1);
    expect(projects.rows[0].title).toBe('Untitled manuscript');

    const docs = await getTestPool().query<{ project_id: string }>(
      'SELECT project_id FROM documents WHERE user_id = $1',
      [user.id]
    );
    expect(docs.rows).toHaveLength(2);
    expect(docs.rows.every((d) => d.project_id === projects.rows[0].id)).toBe(
      true
    );
  });
});
