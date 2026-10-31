import { useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { useQueryClient } from '@tanstack/react-query';
import { plotQueryKey } from '@web/features/plot/api/plot.api';
import { PLOT_VIEW_STORAGE_PREFIX } from '@web/features/plot/constants/plot.constants';
import type { Plot, PlotView } from '@web/features/plot/plot.types';

export type PlotViewKind = 'plotline' | 'beat';

const EMPTY_VIEW: PlotView = { hiddenPlotlineIds: [], hiddenBeatIds: [] };

const FIELD = {
  plotline: 'hiddenPlotlineIds',
  beat: 'hiddenBeatIds',
} as const satisfies Record<PlotViewKind, keyof PlotView>;

const isIdList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((id) => typeof id === 'string');

function isPlotView(value: unknown): value is PlotView {
  if (typeof value !== 'object' || value === null) return false;
  const view = value as Record<string, unknown>;
  return isIdList(view.hiddenPlotlineIds) && isIdList(view.hiddenBeatIds);
}

// A lost filter only means everything shows again, so storage failures
// (private mode, blocked site data, a full quota) fall back to that rather
// than breaking the board. A failed write still filters in memory.
const safeStorage = {
  getItem(key: string, initialValue: PlotView): PlotView {
    try {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw === null ? null : JSON.parse(raw);
      return isPlotView(parsed) ? parsed : initialValue;
    } catch {
      return initialValue;
    }
  },
  setItem(key: string, value: PlotView): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // See above.
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // See above.
    }
  },
};

// getOnInit reads storage when the atom is created, so a hidden item never
// flashes on screen before the stored view loads.
const createViewAtom = (projectId: string) =>
  atomWithStorage(
    PLOT_VIEW_STORAGE_PREFIX + projectId,
    EMPTY_VIEW,
    safeStorage,
    {
      getOnInit: true,
    }
  );

// One atom per project, shared by the board and the sidebar. atomFamily would
// do this but is deprecated in jotai/utils.
const viewAtoms = new Map<string, ReturnType<typeof createViewAtom>>();

function plotViewAtom(projectId: string) {
  let viewAtom = viewAtoms.get(projectId);
  if (!viewAtom) {
    viewAtom = createViewAtom(projectId);
    viewAtoms.set(projectId, viewAtom);
  }
  return viewAtom;
}

function pruneView(view: PlotView, plot: Plot): PlotView {
  const plotlineIds = new Set(plot.plotlines.map((p) => p.id));
  const beatIds = new Set(plot.beats.map((b) => b.id));
  return {
    hiddenPlotlineIds: view.hiddenPlotlineIds.filter((id) =>
      plotlineIds.has(id)
    ),
    hiddenBeatIds: view.hiddenBeatIds.filter((id) => beatIds.has(id)),
  };
}

export function usePlotView(projectId: string) {
  const [view, setView] = useAtom(plotViewAtom(projectId));
  const queryClient = useQueryClient();

  const update = useCallback(
    (change: (view: PlotView) => PlotView) =>
      setView((prev) => {
        const next = change(prev);
        const plot = queryClient.getQueryData<Plot>(plotQueryKey(projectId));
        return plot ? pruneView(next, plot) : next;
      }),
    [projectId, queryClient, setView]
  );

  const toggle = useCallback(
    (kind: PlotViewKind, id: string) =>
      update((prev) => {
        const ids = prev[FIELD[kind]];
        return {
          ...prev,
          [FIELD[kind]]: ids.includes(id)
            ? ids.filter((hidden) => hidden !== id)
            : [...ids, id],
        };
      }),
    [update]
  );

  const showAll = useCallback(
    (kind?: PlotViewKind) =>
      update((prev) => (kind ? { ...prev, [FIELD[kind]]: [] } : EMPTY_VIEW)),
    [update]
  );

  const isHidden = useCallback(
    (kind: PlotViewKind, id: string) => view[FIELD[kind]].includes(id),
    [view]
  );

  return useMemo(
    () => ({ view, toggle, showAll, isHidden }),
    [view, toggle, showAll, isHidden]
  );
}
