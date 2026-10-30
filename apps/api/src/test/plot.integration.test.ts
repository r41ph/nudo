// Ground truth is read through the owner pool, which bypasses RLS but still
// fires triggers, so raw inserts here exercise plot_check_owner too.
import { describe, expect, it } from 'vitest';
import { getTestPool } from './db.js';
import { graphql } from './graphql.js';
import { createUser, getProjectId, type SeededUser } from './seed.js';

const CREATE_PLOTLINE = `
  mutation ($projectId: UUID!, $name: String, $color: String!, $position: Int!) {
    createPlotline(
      input: {
        plotline: {
          projectId: $projectId
          name: $name
          color: $color
          position: $position
        }
      }
    ) {
      plotline {
        id
        userId
        name
        color
        position
      }
    }
  }
`;

const UPDATE_PLOTLINE = `
  mutation ($id: UUID!, $patch: PlotlinePatch!) {
    updatePlotlineById(input: { id: $id, plotlinePatch: $patch }) {
      plotline {
        id
      }
    }
  }
`;

const DELETE_PLOTLINE = `
  mutation ($id: UUID!) {
    deletePlotlineById(input: { id: $id }) {
      deletedPlotlineId
    }
  }
`;

const CREATE_BEAT = `
  mutation ($projectId: UUID!, $name: String, $position: Int!) {
    createPlotBeat(
      input: {
        plotBeat: { projectId: $projectId, name: $name, position: $position }
      }
    ) {
      plotBeat {
        id
        userId
        name
        position
      }
    }
  }
`;

const UPDATE_BEAT = `
  mutation ($id: UUID!, $patch: PlotBeatPatch!) {
    updatePlotBeatById(input: { id: $id, plotBeatPatch: $patch }) {
      plotBeat {
        id
      }
    }
  }
`;

const DELETE_BEAT = `
  mutation ($id: UUID!) {
    deletePlotBeatById(input: { id: $id }) {
      deletedPlotBeatId
    }
  }
`;

const START_PLOT = `
  mutation ($projectId: UUID!) {
    startPlot(input: { plotProjectId: $projectId }) {
      clientMutationId
    }
  }
`;

const REORDER_PLOTLINES = `
  mutation ($projectId: UUID!, $ids: [UUID]!) {
    reorderPlotlines(input: { plotProjectId: $projectId, orderedIds: $ids }) {
      clientMutationId
    }
  }
`;

const REORDER_BEATS = `
  mutation ($projectId: UUID!, $ids: [UUID]!) {
    reorderPlotBeats(input: { plotProjectId: $projectId, orderedIds: $ids }) {
      clientMutationId
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

async function insertPlotline(
  owner: Pick<SeededUser, 'id'>,
  projectId: string,
  opts: { name?: string; color?: string; position?: number } = {}
): Promise<string> {
  const { rows } = await getTestPool().query<{ id: string }>(
    `INSERT INTO plotlines (user_id, project_id, name, color, position)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [
      owner.id,
      projectId,
      opts.name ?? 'A plotline',
      opts.color ?? 'color1',
      opts.position ?? 0,
    ]
  );
  return rows[0].id;
}

async function insertBeat(
  owner: Pick<SeededUser, 'id'>,
  projectId: string,
  opts: { name?: string; position?: number } = {}
): Promise<string> {
  const { rows } = await getTestPool().query<{ id: string }>(
    `INSERT INTO plot_beats (user_id, project_id, name, position)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [owner.id, projectId, opts.name ?? 'A beat', opts.position ?? 0]
  );
  return rows[0].id;
}

type PlotTable = 'plotlines' | 'plot_beats';

async function rowOf(
  table: PlotTable,
  id: string
): Promise<Record<string, unknown> | undefined> {
  // table is one of two fixed literals, never user input.
  const { rows } = await getTestPool().query(
    `SELECT * FROM ${table} WHERE id = $1`,
    [id]
  );
  return rows[0];
}

async function positionsOf(
  table: PlotTable,
  projectId: string
): Promise<Array<{ id: string; position: number }>> {
  const { rows } = await getTestPool().query<{ id: string; position: number }>(
    `SELECT id, position FROM ${table} WHERE project_id = $1 ORDER BY position`,
    [projectId]
  );
  return rows;
}

async function countIn(table: PlotTable, projectId: string): Promise<number> {
  const { rows } = await getTestPool().query<{ n: number }>(
    `SELECT count(*)::int AS n FROM ${table} WHERE project_id = $1`,
    [projectId]
  );
  return rows[0].n;
}

describe('plotlines: generic CRUD', () => {
  it('creates a plotline owned by the caller without sending user_id', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);

    const res = await graphql<{
      createPlotline: {
        plotline: { id: string; userId: string; name: string; color: string };
      };
    }>(
      CREATE_PLOTLINE,
      { projectId, name: 'Main plot', color: 'color7', position: 0 },
      user.token
    );

    expect(res.errors).toBeUndefined();
    const plotline = res.data!.createPlotline.plotline;
    expect(plotline).toMatchObject({
      userId: user.id,
      name: 'Main plot',
      color: 'color7',
    });
    expect(await rowOf('plotlines', plotline.id)).toMatchObject({
      user_id: user.id,
      project_id: projectId,
    });
  });

  it('defaults the name to "Untitled plotline"', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);

    const res = await graphql<{
      createPlotline: { plotline: { name: string } };
    }>(
      CREATE_PLOTLINE,
      { projectId, color: 'color1', position: 0 },
      user.token
    );

    expect(res.errors).toBeUndefined();
    expect(res.data!.createPlotline.plotline.name).toBe('Untitled plotline');
  });

  it('renames and recolours a plotline', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const id = await insertPlotline(user, projectId);

    const res = await graphql(
      UPDATE_PLOTLINE,
      { id, patch: { name: 'Romance', color: 'color8' } },
      user.token
    );

    expect(res.errors).toBeUndefined();
    expect(await rowOf('plotlines', id)).toMatchObject({
      name: 'Romance',
      color: 'color8',
    });
  });

  it('deletes a plotline', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const id = await insertPlotline(user, projectId);

    const res = await graphql(DELETE_PLOTLINE, { id }, user.token);

    expect(res.errors).toBeUndefined();
    expect(await rowOf('plotlines', id)).toBeUndefined();
  });

  it.each([
    ['blank', ''],
    ['whitespace-only', '   '],
    ['121-character', 'x'.repeat(121)],
  ])('rejects a %s name', async (_label, name) => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const id = await insertPlotline(user, projectId, { name: 'Kept' });

    const res = await graphql(
      UPDATE_PLOTLINE,
      { id, patch: { name } },
      user.token
    );

    expect(res.errors).toBeDefined();
    expect(await rowOf('plotlines', id)).toMatchObject({ name: 'Kept' });
  });

  it('rejects a colour outside the palette', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);

    const res = await graphql(
      CREATE_PLOTLINE,
      { projectId, color: '#ff0000', position: 0 },
      user.token
    );

    expect(res.errors).toBeDefined();
    expect(await countIn('plotlines', projectId)).toBe(0);
  });

  it('accepts every palette key', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const keys = Array.from({ length: 8 }, (_, i) => `color${i + 1}`);

    for (const [position, color] of keys.entries()) {
      const res = await graphql(
        CREATE_PLOTLINE,
        { projectId, color, position },
        user.token
      );
      expect(res.errors).toBeUndefined();
    }
    expect(await countIn('plotlines', projectId)).toBe(keys.length);
  });

  it('rejects colour names and keys outside color1-color8', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);

    for (const color of ['blue', 'plum', 'color0', 'color9']) {
      const res = await graphql(
        CREATE_PLOTLINE,
        { projectId, color, position: 0 },
        user.token
      );
      expect(res.errors).toBeDefined();
    }
    expect(await countIn('plotlines', projectId)).toBe(0);
  });
});

describe('plot beats: generic CRUD', () => {
  it('creates a beat owned by the caller, named "Untitled beat" by default', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);

    const res = await graphql<{
      createPlotBeat: {
        plotBeat: { id: string; userId: string; name: string };
      };
    }>(CREATE_BEAT, { projectId, position: 0 }, user.token);

    expect(res.errors).toBeUndefined();
    const beat = res.data!.createPlotBeat.plotBeat;
    expect(beat).toMatchObject({ userId: user.id, name: 'Untitled beat' });
    expect(await rowOf('plot_beats', beat.id)).toMatchObject({
      project_id: projectId,
    });
  });

  it('renames a beat', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const id = await insertBeat(user, projectId);

    const res = await graphql(
      UPDATE_BEAT,
      { id, patch: { name: 'Midpoint' } },
      user.token
    );

    expect(res.errors).toBeUndefined();
    expect(await rowOf('plot_beats', id)).toMatchObject({ name: 'Midpoint' });
  });

  it('deletes a beat', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const id = await insertBeat(user, projectId);

    const res = await graphql(DELETE_BEAT, { id }, user.token);

    expect(res.errors).toBeUndefined();
    expect(await rowOf('plot_beats', id)).toBeUndefined();
  });

  it.each([
    ['blank', ''],
    ['whitespace-only', '   '],
    ['121-character', 'x'.repeat(121)],
  ])('rejects a %s name', async (_label, name) => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const id = await insertBeat(user, projectId, { name: 'Kept' });

    const res = await graphql(UPDATE_BEAT, { id, patch: { name } }, user.token);

    expect(res.errors).toBeDefined();
    expect(await rowOf('plot_beats', id)).toMatchObject({ name: 'Kept' });
  });
});

describe('start_plot', () => {
  it('creates "Main plot" and Beginning, Middle, End', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);

    const res = await graphql(START_PLOT, { projectId }, user.token);

    expect(res.errors).toBeUndefined();
    const pool = getTestPool();
    const plotlines = await pool.query(
      'SELECT name, color, position, user_id FROM plotlines WHERE project_id = $1',
      [projectId]
    );
    expect(plotlines.rows).toEqual([
      { name: 'Main plot', color: 'color1', position: 0, user_id: user.id },
    ]);
    const beats = await pool.query(
      `SELECT name, position FROM plot_beats
        WHERE project_id = $1 ORDER BY position`,
      [projectId]
    );
    expect(beats.rows).toEqual([
      { name: 'Beginning', position: 0 },
      { name: 'Middle', position: 1 },
      { name: 'End', position: 2 },
    ]);
  });

  it('does nothing when the project already has a plotline', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    await insertPlotline(user, projectId, { name: 'Mine' });

    const res = await graphql(START_PLOT, { projectId }, user.token);

    expect(res.errors).toBeUndefined();
    expect(await countIn('plotlines', projectId)).toBe(1);
    expect(await countIn('plot_beats', projectId)).toBe(0);
  });

  it('does nothing when the project already has a beat', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    await insertBeat(user, projectId, { name: 'Mine' });

    const res = await graphql(START_PLOT, { projectId }, user.token);

    expect(res.errors).toBeUndefined();
    expect(await countIn('plotlines', projectId)).toBe(0);
    expect(await countIn('plot_beats', projectId)).toBe(1);
  });

  it('only touches the given project', async () => {
    const user = await createUser();
    const target = await getProjectId(user);
    const other = await insertProject(user, 'Other');

    await graphql(START_PLOT, { projectId: target }, user.token);

    expect(await countIn('plotlines', other)).toBe(0);
    expect(await countIn('plot_beats', other)).toBe(0);
  });
});

describe.each([
  {
    fn: 'reorder_plotlines',
    table: 'plotlines' as const,
    mutation: REORDER_PLOTLINES,
    insert: insertPlotline,
  },
  {
    fn: 'reorder_plot_beats',
    table: 'plot_beats' as const,
    mutation: REORDER_BEATS,
    insert: insertBeat,
  },
])('$fn', ({ table, mutation, insert }) => {
  async function seedThree(user: SeededUser, projectId: string) {
    // Sparse on purpose: the function must renumber densely, not just swap.
    const a = await insert(user, projectId, { position: 4 });
    const b = await insert(user, projectId, { position: 9 });
    const c = await insert(user, projectId, { position: 12 });
    return [a, b, c];
  }

  it('renumbers densely in the given order', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const [a, b, c] = await seedThree(user, projectId);

    const res = await graphql(
      mutation,
      { projectId, ids: [c, a, b] },
      user.token
    );

    expect(res.errors).toBeUndefined();
    expect(await positionsOf(table, projectId)).toEqual([
      { id: c, position: 0 },
      { id: a, position: 1 },
      { id: b, position: 2 },
    ]);
  });

  it("rejects an id from another of the user's projects", async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const [a, b, c] = await seedThree(user, projectId);
    const other = await insertProject(user, 'Other');
    const stray = await insert(user, other, { position: 0 });
    const before = await positionsOf(table, projectId);

    const res = await graphql(
      mutation,
      { projectId, ids: [stray, a, b, c] },
      user.token
    );

    expect(res.errors).toBeDefined();
    expect(await positionsOf(table, projectId)).toEqual(before);
    expect(await rowOf(table, stray)).toMatchObject({ position: 0 });
  });

  it("rejects a list missing one of the project's rows", async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const [a, b] = await seedThree(user, projectId);
    const before = await positionsOf(table, projectId);

    const res = await graphql(mutation, { projectId, ids: [b, a] }, user.token);

    expect(res.errors).toBeDefined();
    expect(await positionsOf(table, projectId)).toEqual(before);
  });

  it('rejects a list with a duplicate id', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const [a, b, c] = await seedThree(user, projectId);
    const before = await positionsOf(table, projectId);

    const res = await graphql(
      mutation,
      { projectId, ids: [a, b, c, a] },
      user.token
    );

    expect(res.errors).toBeDefined();
    expect(await positionsOf(table, projectId)).toEqual(before);
  });

  it("rejects another user's project", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const projectId = await getProjectId(owner);
    const [a, b, c] = await seedThree(owner, projectId);
    const before = await positionsOf(table, projectId);

    const res = await graphql(
      mutation,
      { projectId, ids: [c, b, a] },
      intruder.token
    );

    expect(res.errors).toBeDefined();
    expect(await positionsOf(table, projectId)).toEqual(before);
  });
});

describe('plot_check_owner trigger', () => {
  it.each([
    ['plotline', 'plotlines' as const],
    ['beat', 'plot_beats' as const],
  ])(
    'rejects a %s in a project owned by another user',
    async (_label, table) => {
      const owner = await createUser();
      const other = await createUser();
      const projectId = await getProjectId(owner);
      const insert = table === 'plotlines' ? insertPlotline : insertBeat;

      await expect(insert(other, projectId)).rejects.toThrow();
      expect(await countIn(table, projectId)).toBe(0);
    }
  );

  it.each([
    ['plotline', 'plotlines' as const],
    ['beat', 'plot_beats' as const],
  ])('rejects a project_id change on a %s', async (_label, table) => {
    const user = await createUser();
    const from = await getProjectId(user);
    const to = await insertProject(user, 'To');
    const insert = table === 'plotlines' ? insertPlotline : insertBeat;
    const id = await insert(user, from);

    await expect(
      getTestPool().query(`UPDATE ${table} SET project_id = $1 WHERE id = $2`, [
        to,
        id,
      ])
    ).rejects.toThrow();
    expect(await rowOf(table, id)).toMatchObject({ project_id: from });
  });

  it('rejects a project_id change through generic updatePlotlineById', async () => {
    const user = await createUser();
    const from = await getProjectId(user);
    const to = await insertProject(user, 'To');
    const id = await insertPlotline(user, from);

    const res = await graphql(
      UPDATE_PLOTLINE,
      { id, patch: { projectId: to } },
      user.token
    );

    expect(res.errors).toBeDefined();
    expect(await rowOf('plotlines', id)).toMatchObject({ project_id: from });
  });

  it('rejects a project_id change through generic updatePlotBeatById', async () => {
    const user = await createUser();
    const from = await getProjectId(user);
    const to = await insertProject(user, 'To');
    const id = await insertBeat(user, from);

    const res = await graphql(
      UPDATE_BEAT,
      { id, patch: { projectId: to } },
      user.token
    );

    expect(res.errors).toBeDefined();
    expect(await rowOf('plot_beats', id)).toMatchObject({ project_id: from });
  });
});

describe('RLS: plotlines and beats', () => {
  it("user B cannot read user A's plotlines or beats", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const projectId = await getProjectId(userA);
    const plotlineId = await insertPlotline(userA, projectId);
    const beatId = await insertBeat(userA, projectId);

    const res = await graphql<{
      plotlineById: { id: string } | null;
      plotBeatById: { id: string } | null;
      allPlotlines: { nodes: Array<{ id: string }> };
      allPlotBeats: { nodes: Array<{ id: string }> };
    }>(
      `
        query ($plotlineId: UUID!, $beatId: UUID!) {
          plotlineById(id: $plotlineId) {
            id
          }
          plotBeatById(id: $beatId) {
            id
          }
          allPlotlines {
            nodes {
              id
            }
          }
          allPlotBeats {
            nodes {
              id
            }
          }
        }
      `,
      { plotlineId, beatId },
      userB.token
    );

    expect(res.errors).toBeUndefined();
    expect(res.data!.plotlineById).toBeNull();
    expect(res.data!.plotBeatById).toBeNull();
    expect(res.data!.allPlotlines.nodes).toEqual([]);
    expect(res.data!.allPlotBeats.nodes).toEqual([]);
  });

  it("user B cannot rename or recolour user A's plotline", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const projectId = await getProjectId(userA);
    const id = await insertPlotline(userA, projectId, { name: 'Original' });

    await graphql(
      UPDATE_PLOTLINE,
      { id, patch: { name: 'Hijacked', color: 'color8' } },
      userB.token
    );

    expect(await rowOf('plotlines', id)).toMatchObject({
      name: 'Original',
      color: 'color1',
    });
  });

  it("user B cannot rename user A's beat", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const projectId = await getProjectId(userA);
    const id = await insertBeat(userA, projectId, { name: 'Original' });

    await graphql(
      UPDATE_BEAT,
      { id, patch: { name: 'Hijacked' } },
      userB.token
    );

    expect(await rowOf('plot_beats', id)).toMatchObject({ name: 'Original' });
  });

  it("user B cannot delete user A's plotline or beat", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const projectId = await getProjectId(userA);
    const plotlineId = await insertPlotline(userA, projectId);
    const beatId = await insertBeat(userA, projectId);

    await graphql(DELETE_PLOTLINE, { id: plotlineId }, userB.token);
    await graphql(DELETE_BEAT, { id: beatId }, userB.token);

    expect(await rowOf('plotlines', plotlineId)).toBeDefined();
    expect(await rowOf('plot_beats', beatId)).toBeDefined();
  });

  it("user B cannot add a plotline or beat to user A's project", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const projectId = await getProjectId(userA);

    const plotline = await graphql(
      CREATE_PLOTLINE,
      { projectId, color: 'color1', position: 0 },
      userB.token
    );
    const beat = await graphql(
      CREATE_BEAT,
      { projectId, position: 0 },
      userB.token
    );

    expect(plotline.errors).toBeDefined();
    expect(beat.errors).toBeDefined();
    expect(await countIn('plotlines', projectId)).toBe(0);
    expect(await countIn('plot_beats', projectId)).toBe(0);
  });

  it("user B cannot start a plot in user A's project", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const projectId = await getProjectId(userA);

    const res = await graphql(START_PLOT, { projectId }, userB.token);

    expect(res.errors).toBeDefined();
    expect(await countIn('plotlines', projectId)).toBe(0);
    expect(await countIn('plot_beats', projectId)).toBe(0);
  });
});

describe('deleting a project', () => {
  it('cascades to its plotlines and beats', async () => {
    const user = await createUser();
    const projectId = await insertProject(user);
    const plotlineId = await insertPlotline(user, projectId);
    const beatId = await insertBeat(user, projectId);

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
    expect(await rowOf('plotlines', plotlineId)).toBeUndefined();
    expect(await rowOf('plot_beats', beatId)).toBeUndefined();
  });
});

describe('GraphQL schema', () => {
  // user_id is the RLS key and comes from the session; a client-supplied one
  // could only ever be wrong.
  it.each(['PlotlineInput', 'PlotlinePatch', 'PlotBeatInput', 'PlotBeatPatch'])(
    '%s has no userId field',
    async (typeName) => {
      const user = await createUser();

      const res = await graphql<{
        __type: { inputFields: Array<{ name: string }> } | null;
      }>(
        `
          query ($name: String!) {
            __type(name: $name) {
              inputFields {
                name
              }
            }
          }
        `,
        { name: typeName },
        user.token
      );

      expect(res.errors).toBeUndefined();
      expect(res.data!.__type).not.toBeNull();
      const fields = res.data!.__type!.inputFields.map((f) => f.name);
      expect(fields).toContain('projectId');
      expect(fields).not.toContain('userId');
    }
  );
});
