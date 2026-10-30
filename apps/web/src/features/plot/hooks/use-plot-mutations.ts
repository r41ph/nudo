import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CREATE_PLOTLINE,
  CREATE_PLOT_BEAT,
  CREATE_PLOT_CARD,
  DELETE_PLOTLINE,
  DELETE_PLOT_BEAT,
  DELETE_PLOT_CARD,
  MOVE_PLOT_CARD,
  REORDER_PLOTLINES,
  REORDER_PLOT_BEATS,
  START_PLOT,
  UPDATE_PLOTLINE,
  UPDATE_PLOT_BEAT,
  UPDATE_PLOT_CARD,
  plotQueryKey,
} from '@web/features/plot/api/plot.api';
import {
  NEW_BEAT_NAME,
  NEW_PLOTLINE_NAME,
  PLOT_SAVE_ERROR,
  PLOT_SAVE_ERROR_ID,
} from '@web/features/plot/constants/plot.constants';
import {
  applyCardMove,
  cellKey,
  nextPlotlineColor,
} from '@web/features/plot/lib/plot.utils';
import type {
  Plot,
  PlotBeat,
  PlotCard,
  PlotCell,
  Plotline,
  PlotlineColor,
} from '@web/features/plot/plot.types';
import { graphqlClient } from '@web/shared/lib/graphql-client';

type PlotlinePatch = Partial<{ name: string; color: PlotlineColor }>;
type PlotBeatPatch = Partial<{ name: string }>;
// Placement changes go through moveCard, which keeps positions dense.
type PlotCardPatch = Partial<{ title: string; description: string }>;

interface CardMove {
  id: string;
  to: PlotCell;
  orderedIds: string[];
}

interface Positioned {
  id: string;
  position: number;
}

function nextPosition(rows: readonly Positioned[]): number {
  return rows.reduce((max, row) => Math.max(max, row.position), -1) + 1;
}

function inOrder<T extends Positioned>(rows: readonly T[], ids: string[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id, position) => {
    const row = byId.get(id);
    return row ? [{ ...row, position }] : [];
  });
}

function showSaveError() {
  toast.error(PLOT_SAVE_ERROR, { id: PLOT_SAVE_ERROR_ID });
}

function useOptimisticPlotMutation<TVars>(
  projectId: string,
  mutationFn: (vars: TVars) => Promise<unknown>,
  apply: (plot: Plot, vars: TVars) => Plot,
  onSuccess?: (vars: TVars) => void
) {
  const queryClient = useQueryClient();
  const queryKey = plotQueryKey(projectId);

  return useMutation({
    mutationFn,
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Plot>(queryKey);
      if (previous) queryClient.setQueryData(queryKey, apply(previous, vars));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      showSaveError();
    },
    onSuccess: (_data, vars) => onSuccess?.(vars),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

// Pessimistic, for the card editor (spec §16): the cache changes only once
// the server confirms, and the caller's promise rejects on failure so the
// dialog can stay open with the text intact.
function useConfirmedPlotMutation<TVars>(
  projectId: string,
  mutationFn: (vars: TVars) => Promise<unknown>,
  apply: (plot: Plot, vars: TVars) => Plot
) {
  const queryClient = useQueryClient();
  const queryKey = plotQueryKey(projectId);

  return useMutation({
    mutationFn,
    onSuccess: (_data, vars) =>
      queryClient.setQueryData<Plot>(
        queryKey,
        (plot) => plot && apply(plot, vars)
      ),
    onError: showSaveError,
    // Not returned: the editor's promise would otherwise wait for the
    // refetch too, keeping the dialog open for an extra round trip.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function usePlotMutations(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = plotQueryKey(projectId);
  const currentPlot = () => queryClient.getQueryData<Plot>(queryKey);

  // Pessimistic: it fills an empty board with rows only the server names.
  const startPlot = useMutation({
    mutationFn: () => graphqlClient.request(START_PLOT, { projectId }),
    onError: showSaveError,
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const createPlotline = useOptimisticPlotMutation(
    projectId,
    (plotline: Plotline) =>
      graphqlClient.request(CREATE_PLOTLINE, { ...plotline, projectId }),
    (plot, plotline) => ({ ...plot, plotlines: [...plot.plotlines, plotline] })
  );

  const patchPlotline = useOptimisticPlotMutation(
    projectId,
    ({ id, patch }: { id: string; patch: PlotlinePatch }) =>
      graphqlClient.request(UPDATE_PLOTLINE, { id, patch }),
    (plot, { id, patch }) => ({
      ...plot,
      plotlines: plot.plotlines.map((p) =>
        p.id === id ? { ...p, ...patch } : p
      ),
    })
  );

  const reorderPlotlines = useOptimisticPlotMutation(
    projectId,
    (ids: string[]) =>
      graphqlClient.request(REORDER_PLOTLINES, { projectId, ids }),
    (plot, ids) => ({ ...plot, plotlines: inOrder(plot.plotlines, ids) })
  );

  const deletePlotline = useOptimisticPlotMutation(
    projectId,
    (plotline: Plotline) =>
      graphqlClient.request(DELETE_PLOTLINE, { id: plotline.id }),
    (plot, plotline) => ({
      ...plot,
      plotlines: plot.plotlines.filter((p) => p.id !== plotline.id),
    }),
    (plotline) => toast(`Deleted "${plotline.name}"`)
  );

  const createBeat = useOptimisticPlotMutation(
    projectId,
    (beat: PlotBeat) =>
      graphqlClient.request(CREATE_PLOT_BEAT, { ...beat, projectId }),
    (plot, beat) => ({ ...plot, beats: [...plot.beats, beat] })
  );

  const patchBeat = useOptimisticPlotMutation(
    projectId,
    ({ id, patch }: { id: string; patch: PlotBeatPatch }) =>
      graphqlClient.request(UPDATE_PLOT_BEAT, { id, patch }),
    (plot, { id, patch }) => ({
      ...plot,
      beats: plot.beats.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })
  );

  const reorderBeats = useOptimisticPlotMutation(
    projectId,
    (ids: string[]) =>
      graphqlClient.request(REORDER_PLOT_BEATS, { projectId, ids }),
    (plot, ids) => ({ ...plot, beats: inOrder(plot.beats, ids) })
  );

  const deleteBeat = useOptimisticPlotMutation(
    projectId,
    (beat: PlotBeat) =>
      graphqlClient.request(DELETE_PLOT_BEAT, { id: beat.id }),
    (plot, beat) => ({
      ...plot,
      beats: plot.beats.filter((b) => b.id !== beat.id),
    }),
    (beat) => toast(`Deleted "${beat.name}"`)
  );

  const createCard = useConfirmedPlotMutation(
    projectId,
    (card: PlotCard) =>
      graphqlClient.request(CREATE_PLOT_CARD, { ...card, projectId }),
    (plot, card) => ({ ...plot, cards: [...plot.cards, card] })
  );

  const patchCard = useConfirmedPlotMutation(
    projectId,
    ({ id, patch }: { id: string; patch: PlotCardPatch }) =>
      graphqlClient.request(UPDATE_PLOT_CARD, { id, patch }),
    (plot, { id, patch }) => ({
      ...plot,
      cards: plot.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
  );

  const deleteCard = useConfirmedPlotMutation(
    projectId,
    (id: string) => graphqlClient.request(DELETE_PLOT_CARD, { id }),
    (plot, id) => ({ ...plot, cards: plot.cards.filter((c) => c.id !== id) })
  );

  // The editor's Location: confirmed like its other saves, so a failure keeps
  // the dialog open instead of rolling back behind it.
  const relocateCard = useConfirmedPlotMutation(
    projectId,
    ({ id, to, orderedIds }: CardMove) =>
      graphqlClient.request(MOVE_PLOT_CARD, { id, ...to, orderedIds }),
    (plot, { id, to, orderedIds }) => ({
      ...plot,
      cards:
        applyCardMove(plot.cards, id, to, orderedIds.indexOf(id))?.cards ??
        plot.cards,
    })
  );

  const moveCard = useOptimisticPlotMutation(
    projectId,
    ({ id, to, orderedIds }: CardMove) =>
      graphqlClient.request(MOVE_PLOT_CARD, { id, ...to, orderedIds }),
    (plot, { id, to, orderedIds }) => ({
      ...plot,
      cards:
        applyCardMove(plot.cards, id, to, orderedIds.indexOf(id))?.cards ??
        plot.cards,
    })
  );

  return {
    startPlot,
    addPlotline: () => {
      const plotlines = currentPlot()?.plotlines ?? [];
      createPlotline.mutate({
        id: crypto.randomUUID(),
        name: NEW_PLOTLINE_NAME,
        color: nextPlotlineColor(plotlines.map((p) => p.color)),
        position: nextPosition(plotlines),
      });
    },
    updatePlotline: (id: string, patch: PlotlinePatch) =>
      patchPlotline.mutate({ id, patch }),
    reorderPlotlines: (ids: string[]) => reorderPlotlines.mutate(ids),
    deletePlotline: (plotline: Plotline) => deletePlotline.mutate(plotline),
    addBeat: () => {
      const beats = currentPlot()?.beats ?? [];
      createBeat.mutate({
        id: crypto.randomUUID(),
        name: NEW_BEAT_NAME,
        position: nextPosition(beats),
      });
    },
    updateBeat: (id: string, patch: PlotBeatPatch) =>
      patchBeat.mutate({ id, patch }),
    reorderBeats: (ids: string[]) => reorderBeats.mutate(ids),
    deleteBeat: (beat: PlotBeat) => deleteBeat.mutate(beat),
    createCard: (
      cell: PlotCell,
      fields: { title: string; description: string }
    ) => {
      const inCell = (currentPlot()?.cards ?? []).filter(
        (c) => cellKey(c) === cellKey(cell)
      );
      return createCard.mutateAsync({
        id: crypto.randomUUID(),
        ...cell,
        ...fields,
        position: nextPosition(inCell),
      });
    },
    updateCard: (id: string, patch: PlotCardPatch) =>
      patchCard.mutateAsync({ id, patch }),
    deleteCard: (id: string) => deleteCard.mutateAsync(id),
    relocateCard: async (id: string, to: PlotCell) => {
      const move = applyCardMove(
        currentPlot()?.cards ?? [],
        id,
        to,
        Number.POSITIVE_INFINITY
      );
      if (!move) throw new Error(`Unknown plot card ${id}`);
      return relocateCard.mutateAsync({ id, to, orderedIds: move.orderedIds });
    },
    moveCard: (id: string, to: PlotCell, index: number) => {
      const move = applyCardMove(currentPlot()?.cards ?? [], id, to, index);
      if (move) moveCard.mutate({ id, to, orderedIds: move.orderedIds });
    },
  };
}
