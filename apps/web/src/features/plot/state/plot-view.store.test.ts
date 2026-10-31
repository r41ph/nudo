import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { usePlotView } from '@web/features/plot/state/plot-view.store';
import { plotQueryKey } from '@web/features/plot/api/plot.api';
import { PLOT_VIEW_STORAGE_PREFIX } from '@web/features/plot/constants/plot.constants';
import type { Plot } from '@web/features/plot/plot.types';
import { createStore, renderHookWithProviders } from '@web/test/test-utils';

const getItem = vi.mocked(localStorage.getItem);
const setItem = vi.mocked(localStorage.setItem);
const realGetItem = getItem.getMockImplementation()!;
const realSetItem = setItem.getMockImplementation()!;

afterEach(() => {
  getItem.mockImplementation(realGetItem);
  setItem.mockImplementation(realSetItem);
});

// Atoms are cached per project for the life of the module, so each test
// takes its own id to start from a fresh atom.
let nextId = 0;
const freshProjectId = () => `project-${++nextId}`;

const stored = (projectId: string) =>
  JSON.parse(localStorage.getItem(PLOT_VIEW_STORAGE_PREFIX + projectId)!);

const PLOT: Plot = {
  plotlines: [
    { id: 'p1', name: 'Main', color: 'color1', position: 0 },
    { id: 'p2', name: 'Ada', color: 'color2', position: 1 },
  ],
  beats: [
    { id: 'b1', name: 'Start', position: 0 },
    { id: 'b2', name: 'Middle', position: 1 },
  ],
  cards: [],
};

describe('usePlotView', () => {
  it('hides nothing by default', () => {
    const projectId = freshProjectId();
    const { result } = renderHookWithProviders(() => usePlotView(projectId));

    expect(result.current.view).toEqual({
      hiddenPlotlineIds: [],
      hiddenBeatIds: [],
    });
    expect(result.current.isHidden('plotline', 'p1')).toBe(false);
  });

  it('toggles an item hidden and back, persisting each change', () => {
    const projectId = freshProjectId();
    const { result } = renderHookWithProviders(() => usePlotView(projectId));

    act(() => result.current.toggle('beat', 'b2'));
    expect(result.current.isHidden('beat', 'b2')).toBe(true);
    expect(result.current.isHidden('plotline', 'b2')).toBe(false);
    expect(stored(projectId)).toEqual({
      hiddenPlotlineIds: [],
      hiddenBeatIds: ['b2'],
    });

    act(() => result.current.toggle('beat', 'b2'));
    expect(result.current.isHidden('beat', 'b2')).toBe(false);
    expect(stored(projectId).hiddenBeatIds).toEqual([]);
  });

  it('reads the stored view on first render', () => {
    const projectId = freshProjectId();
    localStorage.setItem(
      PLOT_VIEW_STORAGE_PREFIX + projectId,
      JSON.stringify({ hiddenPlotlineIds: ['p1'], hiddenBeatIds: [] })
    );

    const { result } = renderHookWithProviders(() => usePlotView(projectId));

    expect(result.current.isHidden('plotline', 'p1')).toBe(true);
  });

  it('shows all of one kind, or of both', () => {
    const projectId = freshProjectId();
    const { result } = renderHookWithProviders(() => usePlotView(projectId));
    act(() => {
      result.current.toggle('plotline', 'p1');
      result.current.toggle('beat', 'b1');
    });

    act(() => result.current.showAll('plotline'));
    expect(result.current.view).toEqual({
      hiddenPlotlineIds: [],
      hiddenBeatIds: ['b1'],
    });

    act(() => result.current.toggle('plotline', 'p2'));
    act(() => result.current.showAll());
    expect(result.current.view).toEqual({
      hiddenPlotlineIds: [],
      hiddenBeatIds: [],
    });
  });

  it('keeps each project separate', () => {
    const first = freshProjectId();
    const second = freshProjectId();
    const store = createStore();
    const a = renderHookWithProviders(() => usePlotView(first), { store });
    const b = renderHookWithProviders(() => usePlotView(second), { store });

    act(() => a.result.current.toggle('plotline', 'p1'));

    expect(a.result.current.isHidden('plotline', 'p1')).toBe(true);
    expect(b.result.current.isHidden('plotline', 'p1')).toBe(false);
  });

  it('shares one view between components of the same project', () => {
    const projectId = freshProjectId();
    const store = createStore();
    const a = renderHookWithProviders(() => usePlotView(projectId), { store });
    const b = renderHookWithProviders(() => usePlotView(projectId), { store });

    act(() => a.result.current.toggle('beat', 'b1'));

    expect(b.result.current.isHidden('beat', 'b1')).toBe(true);
  });

  it('prunes ids the current plot no longer has on the next write', () => {
    const projectId = freshProjectId();
    localStorage.setItem(
      PLOT_VIEW_STORAGE_PREFIX + projectId,
      JSON.stringify({ hiddenPlotlineIds: ['deleted'], hiddenBeatIds: [] })
    );
    const { result, queryClient } = renderHookWithProviders(() =>
      usePlotView(projectId)
    );
    queryClient.setQueryData(plotQueryKey(projectId), PLOT);

    act(() => result.current.toggle('plotline', 'p2'));

    expect(result.current.view.hiddenPlotlineIds).toEqual(['p2']);
    expect(stored(projectId).hiddenPlotlineIds).toEqual(['p2']);
  });

  it('falls back to nothing hidden when storage cannot be read', () => {
    getItem.mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });

    const projectId = freshProjectId();
    const { result } = renderHookWithProviders(() => usePlotView(projectId));

    expect(result.current.view).toEqual({
      hiddenPlotlineIds: [],
      hiddenBeatIds: [],
    });
  });

  it('ignores a stored value that is not a view', () => {
    const projectId = freshProjectId();
    localStorage.setItem(PLOT_VIEW_STORAGE_PREFIX + projectId, '{"oops":1');

    const { result } = renderHookWithProviders(() => usePlotView(projectId));

    expect(result.current.view.hiddenPlotlineIds).toEqual([]);
  });

  it('still filters in memory when storage cannot be written', () => {
    setItem.mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const projectId = freshProjectId();
    const { result } = renderHookWithProviders(() => usePlotView(projectId));

    act(() => result.current.toggle('plotline', 'p1'));

    expect(result.current.isHidden('plotline', 'p1')).toBe(true);
  });
});
