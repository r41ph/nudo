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
import { server } from '@web/test/mocks/server';
import {
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
