import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { usePlot } from '@web/features/plot/hooks/use-plot';
import { usePlotMutations } from '@web/features/plot/hooks/use-plot-mutations';
import {
  PLOT_SAVE_ERROR,
  PLOT_SAVE_ERROR_ID,
} from '@web/features/plot/constants/plot.constants';
import { cellKey, groupCardsByCell } from '@web/features/plot/lib/plot.utils';
import type { PlotCard } from '@web/features/plot/plot.types';
import { server } from '@web/test/mocks/server';
import {
  MOCK_PLOT_CARDS,
  MOCK_PLOTLINES,
  MOCK_PLOT_BEATS,
  MOCK_PROJECT,
} from '@web/test/mocks/fixtures';
import { renderHookWithProviders } from '@web/test/test-utils';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}));

const [main, ada] = MOCK_PLOTLINES;
const [beginning, middle, end] = MOCK_PLOT_BEATS;
const [logbook, untitled, storm, ferry] = MOCK_PLOT_CARDS;

// The test client has gcTime 0, so the plot query needs an observer for the
// optimistic writes to land somewhere readable.
async function renderPlot(projectId: string = MOCK_PROJECT.id) {
  const hook = renderHookWithProviders(() => ({
    plot: usePlot(projectId),
    mutations: usePlotMutations(projectId),
  }));
  await waitFor(() => expect(hook.result.current.plot.isSuccess).toBe(true));
  return hook;
}

// Holds a mutation in flight so the optimistic state can be asserted before
// the server answers.
function deferred() {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  return { gate, release };
}

function failing(operation: string) {
  return graphql.mutation(operation, () =>
    HttpResponse.json({ errors: [{ message: 'boom' }] })
  );
}

afterEach(() => {
  vi.mocked(toast).mockClear();
  vi.mocked(toast.error).mockClear();
});

describe('usePlotMutations: plotlines', () => {
  it('adds "Untitled plotline" with the next free colour at the end', async () => {
    const variables = vi.fn();
    const { gate, release } = deferred();
    server.use(
      graphql.mutation('CreatePlotline', async ({ variables: vars }) => {
        variables(vars);
        await gate;
        return HttpResponse.json({
          data: { createPlotline: { plotline: { id: vars.id } } },
        });
      })
    );
    const { result } = await renderPlot();

    act(() => result.current.mutations.addPlotline());

    await waitFor(() =>
      expect(result.current.plot.data!.plotlines).toHaveLength(3)
    );
    const added = result.current.plot.data!.plotlines[2];
    expect(added).toMatchObject({
      name: 'Untitled plotline',
      color: 'color2',
      position: 2,
    });
    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({
        id: added.id,
        projectId: MOCK_PROJECT.id,
        name: 'Untitled plotline',
        color: 'color2',
        position: 2,
      })
    );
    release();
  });

  it('renames and recolours optimistically, sending only the patch', async () => {
    const variables = vi.fn();
    const { gate, release } = deferred();
    server.use(
      graphql.mutation('UpdatePlotline', async ({ variables: vars }) => {
        variables(vars);
        await gate;
        return HttpResponse.json({
          data: { updatePlotlineById: { plotline: { id: vars.id } } },
        });
      })
    );
    const { result } = await renderPlot();

    act(() =>
      result.current.mutations.updatePlotline(ada.id, {
        name: 'Romance',
        color: 'color8',
      })
    );

    await waitFor(() =>
      expect(result.current.plot.data!.plotlines[1]).toMatchObject({
        id: ada.id,
        name: 'Romance',
        color: 'color8',
      })
    );
    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({
        id: ada.id,
        patch: { name: 'Romance', color: 'color8' },
      })
    );
    release();
  });

  it('reorders optimistically and sends the full order', async () => {
    const variables = vi.fn();
    const { gate, release } = deferred();
    server.use(
      graphql.mutation('ReorderPlotlines', async ({ variables: vars }) => {
        variables(vars);
        await gate;
        return HttpResponse.json({
          data: { reorderPlotlines: { clientMutationId: null } },
        });
      })
    );
    const { result } = await renderPlot();

    act(() => result.current.mutations.reorderPlotlines([ada.id, main.id]));

    await waitFor(() =>
      expect(
        result.current.plot.data!.plotlines.map((p) => [p.id, p.position])
      ).toEqual([
        [ada.id, 0],
        [main.id, 1],
      ])
    );
    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({
        projectId: MOCK_PROJECT.id,
        ids: [ada.id, main.id],
      })
    );
    release();
  });

  it('deletes optimistically and confirms with a toast', async () => {
    const { gate, release } = deferred();
    server.use(
      graphql.mutation('DeletePlotline', async ({ variables: vars }) => {
        await gate;
        return HttpResponse.json({
          data: { deletePlotlineById: { deletedPlotlineId: vars.id } },
        });
      })
    );
    const { result } = await renderPlot();

    act(() => result.current.mutations.deletePlotline(ada));

    await waitFor(() =>
      expect(result.current.plot.data!.plotlines.map((p) => p.id)).toEqual([
        main.id,
      ])
    );
    expect(toast).not.toHaveBeenCalled();
    release();
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Deleted "Ada"'));
  });

  it('rolls back a failed reorder and shows the save error', async () => {
    const { gate, release } = deferred();
    server.use(
      graphql.mutation('ReorderPlotlines', async () => {
        await gate;
        return HttpResponse.json({ errors: [{ message: 'boom' }] });
      })
    );
    const { result } = await renderPlot();

    act(() => result.current.mutations.reorderPlotlines([ada.id, main.id]));
    await waitFor(() =>
      expect(result.current.plot.data!.plotlines[0].id).toBe(ada.id)
    );
    release();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(PLOT_SAVE_ERROR, {
        id: PLOT_SAVE_ERROR_ID,
      })
    );
    expect(result.current.plot.data!.plotlines.map((p) => p.id)).toEqual([
      main.id,
      ada.id,
    ]);
  });

  it('rolls back a failed delete without the confirmation toast', async () => {
    server.use(failing('DeletePlotline'));
    const { result } = await renderPlot();

    act(() => result.current.mutations.deletePlotline(ada));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(result.current.plot.data!.plotlines.map((p) => p.id)).toContain(
      ada.id
    );
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('usePlotMutations: beats', () => {
  it('adds "Untitled beat" at the end', async () => {
    const variables = vi.fn();
    server.use(
      graphql.mutation('CreatePlotBeat', ({ variables: vars }) => {
        variables(vars);
        return HttpResponse.json({
          data: { createPlotBeat: { plotBeat: { id: vars.id } } },
        });
      })
    );
    const { result } = await renderPlot();

    act(() => result.current.mutations.addBeat());

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: MOCK_PROJECT.id,
          name: 'Untitled beat',
          position: 3,
        })
      )
    );
  });

  it('renames optimistically', async () => {
    const { gate, release } = deferred();
    server.use(
      graphql.mutation('UpdatePlotBeat', async ({ variables: vars }) => {
        await gate;
        return HttpResponse.json({
          data: { updatePlotBeatById: { plotBeat: { id: vars.id } } },
        });
      })
    );
    const { result } = await renderPlot();

    act(() =>
      result.current.mutations.updateBeat(middle.id, { name: 'Midpoint' })
    );

    await waitFor(() =>
      expect(result.current.plot.data!.beats[1]).toMatchObject({
        name: 'Midpoint',
      })
    );
    release();
  });

  it('reorders and sends the full order', async () => {
    const variables = vi.fn();
    server.use(
      graphql.mutation('ReorderPlotBeats', ({ variables: vars }) => {
        variables(vars);
        return HttpResponse.json({
          data: { reorderPlotBeats: { clientMutationId: null } },
        });
      })
    );
    const { result } = await renderPlot();

    act(() =>
      result.current.mutations.reorderBeats([end.id, beginning.id, middle.id])
    );

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({
        projectId: MOCK_PROJECT.id,
        ids: [end.id, beginning.id, middle.id],
      })
    );
  });

  it('rolls back a failed rename and shows the save error', async () => {
    server.use(failing('UpdatePlotBeat'));
    const { result } = await renderPlot();

    act(() => result.current.mutations.updateBeat(middle.id, { name: 'Nope' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(PLOT_SAVE_ERROR, {
        id: PLOT_SAVE_ERROR_ID,
      })
    );
    expect(result.current.plot.data!.beats[1].name).toBe('Middle');
  });

  it('deletes optimistically and confirms with a toast', async () => {
    const { gate, release } = deferred();
    server.use(
      graphql.mutation('DeletePlotBeat', async ({ variables: vars }) => {
        await gate;
        return HttpResponse.json({
          data: { deletePlotBeatById: { deletedPlotBeatId: vars.id } },
        });
      })
    );
    const { result } = await renderPlot();

    act(() => result.current.mutations.deleteBeat(end));

    await waitFor(() =>
      expect(result.current.plot.data!.beats.map((b) => b.id)).not.toContain(
        end.id
      )
    );
    release();
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Deleted "End"'));
  });
});

// The sidebar scrolls the new row into view, so it needs to know which one.
describe('usePlotMutations: new ids', () => {
  it('returns the id of the plotline or beat it adds', async () => {
    // Held, so the settle refetch can't replace the optimistic rows.
    const { gate, release } = deferred();
    server.use(
      ...['CreatePlotline', 'CreatePlotBeat'].map((operation) =>
        graphql.mutation(operation, async () => {
          await gate;
          return HttpResponse.json({ data: {} });
        })
      )
    );
    const { result } = await renderPlot();

    let plotlineId = '';
    let beatId = '';
    act(() => {
      plotlineId = result.current.mutations.addPlotline();
      beatId = result.current.mutations.addBeat();
    });

    await waitFor(() => {
      expect(result.current.plot.data!.plotlines.at(-1)!.id).toBe(plotlineId);
      expect(result.current.plot.data!.beats.at(-1)!.id).toBe(beatId);
    });
    release();
  });
});

describe('usePlotMutations: start plot', () => {
  it('waits for the server, then shows the refetched board', async () => {
    let started = false;
    server.use(
      graphql.mutation('StartPlot', () => {
        started = true;
        return HttpResponse.json({
          data: { startPlot: { clientMutationId: null } },
        });
      }),
      graphql.query('GetPlot', () =>
        HttpResponse.json({
          data: started
            ? {
                allPlotlines: { nodes: [main] },
                allPlotBeats: { nodes: MOCK_PLOT_BEATS },
                allPlotCards: { nodes: [] },
              }
            : {
                allPlotlines: { nodes: [] },
                allPlotBeats: { nodes: [] },
                allPlotCards: { nodes: [] },
              },
        })
      )
    );
    const { result } = await renderPlot();
    expect(result.current.plot.data!.plotlines).toEqual([]);

    await act(() => result.current.mutations.startPlot.mutateAsync());

    await waitFor(() =>
      expect(result.current.plot.data!.beats).toHaveLength(3)
    );
  });

  it('shows the save error when it fails', async () => {
    server.use(failing('StartPlot'));
    const { result } = await renderPlot();

    act(() => result.current.mutations.startPlot.mutate());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(PLOT_SAVE_ERROR, {
        id: PLOT_SAVE_ERROR_ID,
      })
    );
    expect(result.current.mutations.startPlot.isError).toBe(true);
  });
});

// The settle refetch would replace the cache with the unchanged fixture, so
// it is held to keep what the mutation wrote readable.
function holdRefetch() {
  const loads = vi.fn();
  const { gate, release } = deferred();
  server.use(
    graphql.query('GetPlot', async () => {
      loads();
      await gate;
      return HttpResponse.json({ data: null });
    })
  );
  return { loads, release };
}

function cardIdsIn(cards: PlotCard[], plotlineId: string, beatId: string) {
  return (
    groupCardsByCell(cards)
      .get(cellKey({ plotlineId, beatId }))
      ?.map((c) => c.id) ?? []
  );
}

describe('usePlotMutations: cards', () => {
  it('creates a card only once the server confirms, at the end of its cell', async () => {
    const variables = vi.fn();
    const { gate, release } = deferred();
    server.use(
      graphql.mutation('CreatePlotCard', async ({ variables: vars }) => {
        variables(vars);
        await gate;
        return HttpResponse.json({
          data: { createPlotCard: { plotCard: { id: vars.id } } },
        });
      })
    );
    const { result } = await renderPlot();
    const refetch = holdRefetch();

    let created!: Promise<unknown>;
    act(() => {
      created = result.current.mutations.createCard(
        { plotlineId: main.id, beatId: beginning.id },
        { title: 'A new idea', description: 'Maybe.' }
      );
    });

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({
        id: expect.any(String),
        projectId: MOCK_PROJECT.id,
        plotlineId: main.id,
        beatId: beginning.id,
        title: 'A new idea',
        description: 'Maybe.',
        position: 2,
      })
    );
    expect(result.current.plot.data!.cards).toHaveLength(
      MOCK_PLOT_CARDS.length
    );

    release();
    await act(() => created);

    const { id } = variables.mock.calls[0][0];
    await waitFor(() =>
      expect(
        cardIdsIn(result.current.plot.data!.cards, main.id, beginning.id)
      ).toEqual([logbook.id, untitled.id, id])
    );
    await waitFor(() => expect(refetch.loads).toHaveBeenCalled());
    refetch.release();
  });

  it('starts an empty cell at position 0', async () => {
    const variables = vi.fn();
    server.use(
      graphql.mutation('CreatePlotCard', ({ variables: vars }) => {
        variables(vars);
        return HttpResponse.json({
          data: { createPlotCard: { plotCard: { id: vars.id } } },
        });
      })
    );
    const { result } = await renderPlot();

    await act(() =>
      result.current.mutations.createCard(
        { plotlineId: ada.id, beatId: beginning.id },
        { title: '', description: '' }
      )
    );

    expect(variables).toHaveBeenCalledWith(
      expect.objectContaining({ position: 0 })
    );
  });

  it('rejects a failed create, shows the save error and adds nothing', async () => {
    server.use(failing('CreatePlotCard'));
    const { result } = await renderPlot();

    await act(() =>
      expect(
        result.current.mutations.createCard(
          { plotlineId: main.id, beatId: beginning.id },
          { title: 'Lost?', description: '' }
        )
      ).rejects.toThrow()
    );

    expect(toast.error).toHaveBeenCalledWith(PLOT_SAVE_ERROR, {
      id: PLOT_SAVE_ERROR_ID,
    });
    expect(result.current.plot.data!.cards).toHaveLength(
      MOCK_PLOT_CARDS.length
    );
  });

  it('updates a card only once the server confirms, sending only the patch', async () => {
    const variables = vi.fn();
    const { gate, release } = deferred();
    server.use(
      graphql.mutation('UpdatePlotCard', async ({ variables: vars }) => {
        variables(vars);
        await gate;
        return HttpResponse.json({
          data: { updatePlotCardById: { plotCard: { id: vars.id } } },
        });
      })
    );
    const { result } = await renderPlot();
    const refetch = holdRefetch();

    let updated!: Promise<unknown>;
    act(() => {
      updated = result.current.mutations.updateCard(untitled.id, {
        title: 'Mother knew',
      });
    });

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({
        id: untitled.id,
        patch: { title: 'Mother knew' },
      })
    );
    const current = () =>
      result.current.plot.data!.cards.find((c) => c.id === untitled.id);
    expect(current()?.title).toBe('');

    release();
    await act(() => updated);

    await waitFor(() =>
      expect(current()).toMatchObject({
        title: 'Mother knew',
        description: untitled.description,
      })
    );
    refetch.release();
  });

  it('rejects a failed update, shows the save error and keeps the card', async () => {
    server.use(failing('UpdatePlotCard'));
    const { result } = await renderPlot();

    await act(() =>
      expect(
        result.current.mutations.updateCard(logbook.id, { title: 'Nope' })
      ).rejects.toThrow()
    );

    expect(toast.error).toHaveBeenCalledWith(PLOT_SAVE_ERROR, {
      id: PLOT_SAVE_ERROR_ID,
    });
    expect(
      result.current.plot.data!.cards.find((c) => c.id === logbook.id)?.title
    ).toBe(logbook.title);
  });

  it('deletes a card only once the server confirms', async () => {
    const variables = vi.fn();
    const { gate, release } = deferred();
    server.use(
      graphql.mutation('DeletePlotCard', async ({ variables: vars }) => {
        variables(vars);
        await gate;
        return HttpResponse.json({
          data: { deletePlotCardById: { deletedPlotCardId: vars.id } },
        });
      })
    );
    const { result } = await renderPlot();
    const refetch = holdRefetch();
    const ids = () => result.current.plot.data!.cards.map((c) => c.id);

    let deleted!: Promise<unknown>;
    act(() => {
      deleted = result.current.mutations.deleteCard(ferry.id);
    });

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({ id: ferry.id })
    );
    expect(ids()).toContain(ferry.id);

    release();
    await act(() => deleted);

    await waitFor(() => expect(ids()).not.toContain(ferry.id));
    refetch.release();
  });

  it('rejects a failed delete, shows the save error and keeps the card', async () => {
    server.use(failing('DeletePlotCard'));
    const { result } = await renderPlot();

    await act(() =>
      expect(result.current.mutations.deleteCard(ferry.id)).rejects.toThrow()
    );

    expect(toast.error).toHaveBeenCalledWith(PLOT_SAVE_ERROR, {
      id: PLOT_SAVE_ERROR_ID,
    });
    expect(result.current.plot.data!.cards.map((c) => c.id)).toContain(
      ferry.id
    );
  });

  it('moves optimistically and sends the full destination order', async () => {
    const variables = vi.fn();
    const { gate, release } = deferred();
    server.use(
      graphql.mutation('MovePlotCard', async ({ variables: vars }) => {
        variables(vars);
        await gate;
        return HttpResponse.json({
          data: { movePlotCard: { clientMutationId: null } },
        });
      })
    );
    const { result } = await renderPlot();

    act(() =>
      result.current.mutations.moveCard(
        logbook.id,
        { plotlineId: main.id, beatId: middle.id },
        0
      )
    );

    await waitFor(() =>
      expect(
        cardIdsIn(result.current.plot.data!.cards, main.id, middle.id)
      ).toEqual([logbook.id, storm.id])
    );
    expect(
      cardIdsIn(result.current.plot.data!.cards, main.id, beginning.id)
    ).toEqual([untitled.id]);
    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({
        id: logbook.id,
        plotlineId: main.id,
        beatId: middle.id,
        orderedIds: [logbook.id, storm.id],
      })
    );
    release();
  });

  it('rolls back a failed move, shows the save error and refetches', async () => {
    const { gate, release } = deferred();
    server.use(
      graphql.mutation('MovePlotCard', async () => {
        await gate;
        return HttpResponse.json({ errors: [{ message: 'boom' }] });
      })
    );
    const { result } = await renderPlot();
    const refetch = holdRefetch();

    act(() =>
      result.current.mutations.moveCard(
        untitled.id,
        { plotlineId: main.id, beatId: beginning.id },
        0
      )
    );
    await waitFor(() =>
      expect(
        cardIdsIn(result.current.plot.data!.cards, main.id, beginning.id)
      ).toEqual([untitled.id, logbook.id])
    );
    release();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(PLOT_SAVE_ERROR, {
        id: PLOT_SAVE_ERROR_ID,
      })
    );
    await waitFor(() =>
      expect(
        cardIdsIn(result.current.plot.data!.cards, main.id, beginning.id)
      ).toEqual([logbook.id, untitled.id])
    );
    await waitFor(() => expect(refetch.loads).toHaveBeenCalled());
    refetch.release();
  });

  it('relocates a card to the end of another cell once the server confirms', async () => {
    const variables = vi.fn();
    const { gate, release } = deferred();
    server.use(
      graphql.mutation('MovePlotCard', async ({ variables: vars }) => {
        variables(vars);
        await gate;
        return HttpResponse.json({
          data: { movePlotCard: { clientMutationId: null } },
        });
      })
    );
    const { result } = await renderPlot();
    const refetch = holdRefetch();

    let moved!: Promise<unknown>;
    act(() => {
      moved = result.current.mutations.relocateCard(logbook.id, {
        plotlineId: main.id,
        beatId: middle.id,
      });
    });

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({
        id: logbook.id,
        plotlineId: main.id,
        beatId: middle.id,
        orderedIds: [storm.id, logbook.id],
      })
    );
    expect(
      cardIdsIn(result.current.plot.data!.cards, main.id, beginning.id)
    ).toEqual([logbook.id, untitled.id]);

    release();
    await act(() => moved);

    await waitFor(() =>
      expect(
        cardIdsIn(result.current.plot.data!.cards, main.id, middle.id)
      ).toEqual([storm.id, logbook.id])
    );
    expect(
      cardIdsIn(result.current.plot.data!.cards, main.id, beginning.id)
    ).toEqual([untitled.id]);
    refetch.release();
  });

  it('rejects a failed relocation, shows the save error and keeps the card', async () => {
    server.use(failing('MovePlotCard'));
    const { result } = await renderPlot();

    await act(() =>
      expect(
        result.current.mutations.relocateCard(ferry.id, {
          plotlineId: main.id,
          beatId: end.id,
        })
      ).rejects.toThrow()
    );

    expect(toast.error).toHaveBeenCalledWith(PLOT_SAVE_ERROR, {
      id: PLOT_SAVE_ERROR_ID,
    });
    expect(cardIdsIn(result.current.plot.data!.cards, ada.id, end.id)).toEqual([
      ferry.id,
    ]);
  });
});
