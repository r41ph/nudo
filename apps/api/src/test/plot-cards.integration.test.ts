// Ground truth is read through the owner pool, which bypasses RLS but still
// fires triggers, so raw inserts here exercise plot_check_owner too.
import { describe, expect, it } from 'vitest';
import { getTestPool } from './db.js';
import { graphql } from './graphql.js';
import {
  createUser,
  getProjectId,
  insertBeat,
  insertPlotline,
  insertProject,
  type SeededUser,
} from './seed.js';

const CREATE_CARD = `
  mutation (
    $projectId: UUID!
    $plotlineId: UUID
    $beatId: UUID
    $title: String
    $description: String
    $position: Int!
  ) {
    createPlotCard(
      input: {
        plotCard: {
          projectId: $projectId
          plotlineId: $plotlineId
          beatId: $beatId
          title: $title
          description: $description
          position: $position
        }
      }
    ) {
      plotCard {
        id
        userId
        title
        description
      }
    }
  }
`;

const UPDATE_CARD = `
  mutation ($id: UUID!, $patch: PlotCardPatch!) {
    updatePlotCardById(input: { id: $id, plotCardPatch: $patch }) {
      plotCard {
        id
      }
    }
  }
`;

const DELETE_CARD = `
  mutation ($id: UUID!) {
    deletePlotCardById(input: { id: $id }) {
      deletedPlotCardId
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

const DELETE_BEAT = `
  mutation ($id: UUID!) {
    deletePlotBeatById(input: { id: $id }) {
      deletedPlotBeatId
    }
  }
`;

const MOVE_CARD = `
  mutation (
    $cardId: UUID!
    $plotlineId: UUID
    $beatId: UUID
    $orderedIds: [UUID]!
  ) {
    movePlotCard(
      input: {
        plotCardId: $cardId
        toPlotlineId: $plotlineId
        toBeatId: $beatId
        orderedIds: $orderedIds
      }
    ) {
      clientMutationId
    }
  }
`;

interface Cell {
  plotlineId: string;
  beatId: string;
}

async function insertCard(
  owner: Pick<SeededUser, 'id'>,
  projectId: string,
  cell: Cell | null,
  opts: { title?: string; position?: number } = {}
): Promise<string> {
  const { rows } = await getTestPool().query<{ id: string }>(
    `INSERT INTO plot_cards
       (user_id, project_id, plotline_id, beat_id, title, position)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      owner.id,
      projectId,
      cell?.plotlineId ?? null,
      cell?.beatId ?? null,
      opts.title ?? 'A card',
      opts.position ?? 0,
    ]
  );
  return rows[0].id;
}

async function cardRow(
  id: string
): Promise<Record<string, unknown> | undefined> {
  const { rows } = await getTestPool().query(
    'SELECT * FROM plot_cards WHERE id = $1',
    [id]
  );
  return rows[0];
}

async function cellOrder(
  cell: Cell
): Promise<Array<{ id: string; position: number }>> {
  const { rows } = await getTestPool().query<{ id: string; position: number }>(
    `SELECT id, position FROM plot_cards
      WHERE plotline_id = $1 AND beat_id = $2 ORDER BY position`,
    [cell.plotlineId, cell.beatId]
  );
  return rows;
}

async function cardCount(projectId: string): Promise<number> {
  const { rows } = await getTestPool().query<{ n: number }>(
    'SELECT count(*)::int AS n FROM plot_cards WHERE project_id = $1',
    [projectId]
  );
  return rows[0].n;
}

async function seedCell(
  owner: Pick<SeededUser, 'id'>,
  projectId: string,
  position = 0
): Promise<Cell> {
  const plotlineId = await insertPlotline(owner, projectId, { position });
  const beatId = await insertBeat(owner, projectId, { position });
  return { plotlineId, beatId };
}

describe('plot cards: generic CRUD', () => {
  it('creates a card owned by the caller without sending user_id', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const cell = await seedCell(user, projectId);

    const res = await graphql<{
      createPlotCard: {
        plotCard: {
          id: string;
          userId: string;
          title: string;
          description: string;
        };
      };
    }>(
      CREATE_CARD,
      {
        projectId,
        ...cell,
        title: 'The logbook',
        description: 'Mother already knew?',
        position: 0,
      },
      user.token
    );

    expect(res.errors).toBeUndefined();
    const card = res.data!.createPlotCard.plotCard;
    expect(card).toMatchObject({
      userId: user.id,
      title: 'The logbook',
      description: 'Mother already knew?',
    });
    expect(await cardRow(card.id)).toMatchObject({
      user_id: user.id,
      project_id: projectId,
      plotline_id: cell.plotlineId,
      beat_id: cell.beatId,
      position: 0,
    });
  });

  it('defaults the title and description to empty strings', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const cell = await seedCell(user, projectId);

    const res = await graphql<{
      createPlotCard: { plotCard: { title: string; description: string } };
    }>(CREATE_CARD, { projectId, ...cell, position: 0 }, user.token);

    expect(res.errors).toBeUndefined();
    expect(res.data!.createPlotCard.plotCard).toMatchObject({
      title: '',
      description: '',
    });
  });

  it('accepts a 200-character title and rejects a 201-character one', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const cell = await seedCell(user, projectId);

    const ok = await graphql(
      CREATE_CARD,
      { projectId, ...cell, title: 'x'.repeat(200), position: 0 },
      user.token
    );
    const tooLong = await graphql(
      CREATE_CARD,
      { projectId, ...cell, title: 'x'.repeat(201), position: 1 },
      user.token
    );

    expect(ok.errors).toBeUndefined();
    expect(tooLong.errors).toBeDefined();
    expect(await cardCount(projectId)).toBe(1);
  });

  it('accepts a description of any length', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const cell = await seedCell(user, projectId);
    const description = 'y'.repeat(20_000);

    const res = await graphql<{
      createPlotCard: { plotCard: { id: string } };
    }>(
      CREATE_CARD,
      { projectId, ...cell, description, position: 0 },
      user.token
    );

    expect(res.errors).toBeUndefined();
    expect(await cardRow(res.data!.createPlotCard.plotCard.id)).toMatchObject({
      description,
    });
  });

  it('updates the title and description', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const cell = await seedCell(user, projectId);
    const id = await insertCard(user, projectId, cell);

    const res = await graphql(
      UPDATE_CARD,
      { id, patch: { title: 'Renamed', description: 'More detail' } },
      user.token
    );

    expect(res.errors).toBeUndefined();
    expect(await cardRow(id)).toMatchObject({
      title: 'Renamed',
      description: 'More detail',
    });
  });

  it('rejects a 201-character title on update', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const cell = await seedCell(user, projectId);
    const id = await insertCard(user, projectId, cell, { title: 'Kept' });

    const res = await graphql(
      UPDATE_CARD,
      { id, patch: { title: 'x'.repeat(201) } },
      user.token
    );

    expect(res.errors).toBeDefined();
    expect(await cardRow(id)).toMatchObject({ title: 'Kept' });
  });

  it('deletes a card', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const cell = await seedCell(user, projectId);
    const id = await insertCard(user, projectId, cell);

    const res = await graphql(DELETE_CARD, { id }, user.token);

    expect(res.errors).toBeUndefined();
    expect(await cardRow(id)).toBeUndefined();
  });
});

describe('plot cards: placement', () => {
  it('accepts a card with neither plotline nor beat (Unassigned)', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);

    const res = await graphql(
      CREATE_CARD,
      { projectId, position: 0 },
      user.token
    );

    expect(res.errors).toBeUndefined();
    expect(await cardCount(projectId)).toBe(1);
  });

  it('rejects a plotline without a beat', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const { plotlineId } = await seedCell(user, projectId);

    const res = await graphql(
      CREATE_CARD,
      { projectId, plotlineId, position: 0 },
      user.token
    );

    expect(res.errors).toBeDefined();
    expect(await cardCount(projectId)).toBe(0);
  });

  it('rejects a beat without a plotline', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const { beatId } = await seedCell(user, projectId);

    const res = await graphql(
      CREATE_CARD,
      { projectId, beatId, position: 0 },
      user.token
    );

    expect(res.errors).toBeDefined();
    expect(await cardCount(projectId)).toBe(0);
  });

  it('rejects clearing only the beat on update', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const cell = await seedCell(user, projectId);
    const id = await insertCard(user, projectId, cell);

    const res = await graphql(
      UPDATE_CARD,
      { id, patch: { beatId: null } },
      user.token
    );

    expect(res.errors).toBeDefined();
    expect(await cardRow(id)).toMatchObject({ beat_id: cell.beatId });
  });
});

describe('plot_check_owner: cards', () => {
  it.each(['plotline', 'beat'] as const)(
    "rejects creating a card whose %s is in another of the user's projects",
    async (foreign) => {
      const user = await createUser();
      const projectId = await getProjectId(user);
      const other = await insertProject(user, 'Other');
      const home = await seedCell(user, projectId);
      const away = await seedCell(user, other);
      const cell =
        foreign === 'plotline'
          ? { plotlineId: away.plotlineId, beatId: home.beatId }
          : { plotlineId: home.plotlineId, beatId: away.beatId };

      const res = await graphql(
        CREATE_CARD,
        { projectId, ...cell, position: 0 },
        user.token
      );

      expect(res.errors).toBeDefined();
      expect(await cardCount(projectId)).toBe(0);
      expect(await cardCount(other)).toBe(0);
    }
  );

  it.each(['plotline', 'beat'] as const)(
    "rejects moving a card to another project's %s through generic update",
    async (foreign) => {
      const user = await createUser();
      const projectId = await getProjectId(user);
      const other = await insertProject(user, 'Other');
      const home = await seedCell(user, projectId);
      const away = await seedCell(user, other);
      const id = await insertCard(user, projectId, home);
      const patch =
        foreign === 'plotline'
          ? { plotlineId: away.plotlineId }
          : { beatId: away.beatId };

      const res = await graphql(UPDATE_CARD, { id, patch }, user.token);

      expect(res.errors).toBeDefined();
      expect(await cardRow(id)).toMatchObject({
        plotline_id: home.plotlineId,
        beat_id: home.beatId,
      });
    }
  );

  it("rejects a card pointing at another user's plotline and beat", async () => {
    const owner = await createUser();
    const other = await createUser();
    const projectId = await getProjectId(owner);
    const theirs = await seedCell(other, await getProjectId(other));

    await expect(insertCard(owner, projectId, theirs)).rejects.toThrow();
    expect(await cardCount(projectId)).toBe(0);
  });

  it('rejects a project_id change through generic update', async () => {
    const user = await createUser();
    const from = await getProjectId(user);
    const to = await insertProject(user, 'To');
    const id = await insertCard(user, from, null);

    const res = await graphql(
      UPDATE_CARD,
      { id, patch: { projectId: to } },
      user.token
    );

    expect(res.errors).toBeDefined();
    expect(await cardRow(id)).toMatchObject({ project_id: from });
  });
});

describe('RESTRICT: populated structure', () => {
  it('a generic plotline delete fails while it has cards', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const cell = await seedCell(user, projectId);
    const cardId = await insertCard(user, projectId, cell);

    const blocked = await graphql(
      DELETE_PLOTLINE,
      { id: cell.plotlineId },
      user.token
    );
    expect(blocked.errors).toBeDefined();
    expect(await cardRow(cardId)).toBeDefined();

    await graphql(DELETE_CARD, { id: cardId }, user.token);
    const res = await graphql(
      DELETE_PLOTLINE,
      { id: cell.plotlineId },
      user.token
    );
    expect(res.errors).toBeUndefined();
  });

  it('a generic beat delete fails while it has cards', async () => {
    const user = await createUser();
    const projectId = await getProjectId(user);
    const cell = await seedCell(user, projectId);
    const cardId = await insertCard(user, projectId, cell);

    const blocked = await graphql(DELETE_BEAT, { id: cell.beatId }, user.token);
    expect(blocked.errors).toBeDefined();
    expect(await cardRow(cardId)).toBeDefined();

    await graphql(DELETE_CARD, { id: cardId }, user.token);
    const res = await graphql(DELETE_BEAT, { id: cell.beatId }, user.token);
    expect(res.errors).toBeUndefined();
  });
});

async function seedBoard(user: SeededUser) {
  const projectId = await getProjectId(user);
  const plotlineId = await insertPlotline(user, projectId);
  const beatA = await insertBeat(user, projectId, { position: 0 });
  const beatB = await insertBeat(user, projectId, { position: 1 });
  const source = { plotlineId, beatId: beatA };
  const dest = { plotlineId, beatId: beatB };
  // Sparse on purpose: the function must renumber densely.
  const [s1, s2, s3] = [
    await insertCard(user, projectId, source, { position: 3 }),
    await insertCard(user, projectId, source, { position: 7 }),
    await insertCard(user, projectId, source, { position: 11 }),
  ];
  const [d1, d2] = [
    await insertCard(user, projectId, dest, { position: 2 }),
    await insertCard(user, projectId, dest, { position: 5 }),
  ];
  return { projectId, source, dest, s1, s2, s3, d1, d2 };
}

type Board = Awaited<ReturnType<typeof seedBoard>>;

async function boardSnapshot(board: Board) {
  return {
    source: await cellOrder(board.source),
    dest: await cellOrder(board.dest),
  };
}

describe('move_plot_card', () => {
  it('reorders within a cell', async () => {
    const user = await createUser();
    const { source, s1, s2, s3 } = await seedBoard(user);

    const res = await graphql(
      MOVE_CARD,
      { cardId: s3, ...source, orderedIds: [s3, s1, s2] },
      user.token
    );

    expect(res.errors).toBeUndefined();
    expect(await cellOrder(source)).toEqual([
      { id: s3, position: 0 },
      { id: s1, position: 1 },
      { id: s2, position: 2 },
    ]);
  });

  it('moves across cells and renumbers both', async () => {
    const user = await createUser();
    const { source, dest, s1, s2, s3, d1, d2 } = await seedBoard(user);

    const res = await graphql(
      MOVE_CARD,
      { cardId: s2, ...dest, orderedIds: [d1, s2, d2] },
      user.token
    );

    expect(res.errors).toBeUndefined();
    expect(await cellOrder(dest)).toEqual([
      { id: d1, position: 0 },
      { id: s2, position: 1 },
      { id: d2, position: 2 },
    ]);
    expect(await cellOrder(source)).toEqual([
      { id: s1, position: 0 },
      { id: s3, position: 1 },
    ]);
  });

  it('moves into an empty cell', async () => {
    const user = await createUser();
    const { projectId, source, s1, s2, s3 } = await seedBoard(user);
    const empty = {
      plotlineId: await insertPlotline(user, projectId, { position: 1 }),
      beatId: source.beatId,
    };

    const res = await graphql(
      MOVE_CARD,
      { cardId: s1, ...empty, orderedIds: [s1] },
      user.token
    );

    expect(res.errors).toBeUndefined();
    expect(await cellOrder(empty)).toEqual([{ id: s1, position: 0 }]);
    expect(await cellOrder(source)).toEqual([
      { id: s2, position: 0 },
      { id: s3, position: 1 },
    ]);
  });

  it.each([
    ['missing a destination card', (b: Board) => [b.s2, b.d2]],
    ['without the moved card', (b: Board) => [b.d1, b.d2]],
    ['with a duplicate id', (b: Board) => [b.d1, b.s2, b.d2, b.d1]],
    ['with a card from another cell', (b: Board) => [b.d1, b.s2, b.d2, b.s1]],
  ])('rejects ordered_ids %s', async (_label, ids) => {
    const user = await createUser();
    const board = await seedBoard(user);
    const before = await boardSnapshot(board);

    const res = await graphql(
      MOVE_CARD,
      { cardId: board.s2, ...board.dest, orderedIds: ids(board) },
      user.token
    );

    expect(res.errors).toBeDefined();
    expect(await boardSnapshot(board)).toEqual(before);
  });

  it('rejects a plotline without a beat', async () => {
    const user = await createUser();
    const board = await seedBoard(user);
    const before = await boardSnapshot(board);

    const res = await graphql(
      MOVE_CARD,
      {
        cardId: board.s2,
        plotlineId: board.dest.plotlineId,
        orderedIds: [board.s2],
      },
      user.token
    );

    expect(res.errors).toBeDefined();
    expect(await boardSnapshot(board)).toEqual(before);
  });

  it.each(['plotline', 'beat'] as const)(
    "rejects a destination %s from another of the user's projects",
    async (foreign) => {
      const user = await createUser();
      const board = await seedBoard(user);
      const away = await seedCell(user, await insertProject(user, 'Other'));
      const dest =
        foreign === 'plotline'
          ? { plotlineId: away.plotlineId, beatId: board.dest.beatId }
          : { plotlineId: board.dest.plotlineId, beatId: away.beatId };
      const before = await boardSnapshot(board);

      const res = await graphql(
        MOVE_CARD,
        { cardId: board.s2, ...dest, orderedIds: [board.s2] },
        user.token
      );

      expect(res.errors).toBeDefined();
      expect(await boardSnapshot(board)).toEqual(before);
    }
  );

  it("rejects moving a card into another user's cell", async () => {
    const user = await createUser();
    const other = await createUser();
    const board = await seedBoard(user);
    const theirs = await seedCell(other, await getProjectId(other));
    const before = await boardSnapshot(board);

    const res = await graphql(
      MOVE_CARD,
      { cardId: board.s2, ...theirs, orderedIds: [board.s2] },
      user.token
    );

    expect(res.errors).toBeDefined();
    expect(await boardSnapshot(board)).toEqual(before);
  });

  it("rejects another user's card", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const board = await seedBoard(owner);
    const before = await boardSnapshot(board);

    const res = await graphql(
      MOVE_CARD,
      {
        cardId: board.s2,
        ...board.dest,
        orderedIds: [board.d1, board.s2, board.d2],
      },
      intruder.token
    );

    expect(res.errors).toBeDefined();
    expect(await boardSnapshot(board)).toEqual(before);
  });
});

describe('RLS: plot cards', () => {
  it("user B cannot read user A's cards", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const projectId = await getProjectId(userA);
    const id = await insertCard(
      userA,
      projectId,
      await seedCell(userA, projectId)
    );

    const res = await graphql<{
      plotCardById: { id: string } | null;
      allPlotCards: { nodes: Array<{ id: string }> };
    }>(
      `
        query ($id: UUID!) {
          plotCardById(id: $id) {
            id
          }
          allPlotCards {
            nodes {
              id
            }
          }
        }
      `,
      { id },
      userB.token
    );

    expect(res.errors).toBeUndefined();
    expect(res.data!.plotCardById).toBeNull();
    expect(res.data!.allPlotCards.nodes).toEqual([]);
  });

  it("user B cannot update user A's card", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const projectId = await getProjectId(userA);
    const id = await insertCard(
      userA,
      projectId,
      await seedCell(userA, projectId),
      { title: 'Original' }
    );

    await graphql(
      UPDATE_CARD,
      { id, patch: { title: 'Hijacked', description: 'Hijacked' } },
      userB.token
    );

    expect(await cardRow(id)).toMatchObject({
      title: 'Original',
      description: '',
    });
  });

  it("user B cannot delete user A's card", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const projectId = await getProjectId(userA);
    const id = await insertCard(
      userA,
      projectId,
      await seedCell(userA, projectId)
    );

    await graphql(DELETE_CARD, { id }, userB.token);

    expect(await cardRow(id)).toBeDefined();
  });

  it("user B cannot add a card to user A's project", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const projectId = await getProjectId(userA);
    const cell = await seedCell(userA, projectId);

    const placed = await graphql(
      CREATE_CARD,
      { projectId, ...cell, position: 0 },
      userB.token
    );
    const unassigned = await graphql(
      CREATE_CARD,
      { projectId, position: 0 },
      userB.token
    );

    expect(placed.errors).toBeDefined();
    expect(unassigned.errors).toBeDefined();
    expect(await cardCount(projectId)).toBe(0);
  });
});

describe('deleting a project', () => {
  it('cascades to its cards', async () => {
    const user = await createUser();
    const projectId = await insertProject(user);
    const id = await insertCard(
      user,
      projectId,
      await seedCell(user, projectId)
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
    expect(await cardRow(id)).toBeUndefined();
  });
});

describe('GraphQL schema', () => {
  // user_id is the RLS key and comes from the session.
  it.each(['PlotCardInput', 'PlotCardPatch'])(
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
