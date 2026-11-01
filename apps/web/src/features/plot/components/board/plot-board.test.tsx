import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  holdMutation,
  renderBoard,
  servePlot,
  view,
  ViewHandle,
} from '@web/features/plot/test/plot-board-harness';
import {
  PLOT_EDIT_MIN_WIDTH,
  PLOT_FILTER_SETTLE_MS,
  PLOT_LABEL_COLUMN_WIDTH,
  PLOT_VIEW_STORAGE_PREFIX,
} from '@web/features/plot/constants/plot.constants';
import { setViewportWidth } from '@web/test/media';
import {
  MOCK_PLOTLINES,
  MOCK_PLOT_BEATS,
  MOCK_PROJECT,
} from '@web/test/mocks/fixtures';

const VIEW_ONLY_BANNER =
  'View only — open nudo on a larger screen to edit the plot.';

describe('PlotBoard', () => {
  // The summary and the add actions moved to the sidebar; the page keeps a
  // heading for screen readers only.
  it('has no visible header, summary or header add buttons', async () => {
    renderBoard();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Plot' })
    ).toHaveClass('sr-only');
    expect(screen.queryByText(/plotlines · /)).toBeNull();
    for (const name of ['Add beat', 'Add plotline']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
  });

  it('lays out beats as columns and plotlines as rows, in order', async () => {
    renderBoard();

    const grid = await screen.findByRole('table', { name: 'Plot board' });
    expect(
      within(grid)
        .getAllByRole('columnheader')
        .map((h) => h.textContent)
    ).toEqual(['Beginning', 'Middle', 'End']);

    const labels = within(grid).getAllByRole('rowheader');
    expect(labels).toHaveLength(2);
    ['Main plot', 'Ada'].forEach((name, i) => {
      expect(within(labels[i]).getByText(name)).toBeVisible();
    });
  });

  it('adds an "Untitled plotline" row with the next colour from + Plotline', async () => {
    const { variables, release } = holdMutation('CreatePlotline');
    renderBoard();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Plotline' })
    );

    expect(
      await screen.findByRole('rowheader', { name: /Untitled plotline/ })
    ).toBeInTheDocument();
    expect(variables).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Untitled plotline',
        color: 'color2',
        position: 2,
      })
    );
    release();
  });
});

describe('PlotBoard — focus mode', () => {
  it('enters focus mode from the top bar button and leaves it again', async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(
      await screen.findByRole('button', { name: 'Enter focus mode' })
    );
    await user.click(screen.getByRole('button', { name: 'Leave focus mode' }));

    expect(
      screen.getByRole('button', { name: 'Enter focus mode' })
    ).toBeInTheDocument();
  });

  it('leaves focus mode on Escape', async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(
      await screen.findByRole('button', { name: 'Enter focus mode' })
    );

    await user.keyboard('{Escape}');

    expect(
      screen.getByRole('button', { name: 'Enter focus mode' })
    ).toBeInTheDocument();
  });

  it('stays in focus mode when Escape cancels a rename', async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(
      await screen.findByRole('button', { name: 'Enter focus mode' })
    );
    await user.click(
      screen.getByRole('button', { name: 'Actions for Middle' })
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    await screen.findByRole('textbox', { name: 'Beat name' });

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('textbox', { name: 'Beat name' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Leave focus mode' })
    ).toBeInTheDocument();
  });
});

describe('PlotBoard — below PLOT_EDIT_MIN_WIDTH', () => {
  it('is view-only: a banner, no add buttons and no menus', async () => {
    setViewportWidth(PLOT_EDIT_MIN_WIDTH - 1);
    renderBoard();

    const grid = await screen.findByRole('table', { name: 'Plot board' });
    expect(screen.getByText(VIEW_ONLY_BANNER)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Plotline' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Actions for/ })).toBeNull();
    expect(
      within(grid)
        .getAllByRole('columnheader')
        .map((h) => h.textContent)
    ).toEqual(['Beginning', 'Middle', 'End']);
    expect(within(grid).getAllByRole('rowheader')).toHaveLength(2);
  });

  it('is editable at exactly PLOT_EDIT_MIN_WIDTH', async () => {
    setViewportWidth(PLOT_EDIT_MIN_WIDTH);
    renderBoard();

    expect(
      await screen.findByRole('button', { name: 'Plotline' })
    ).toBeInTheDocument();
    expect(screen.queryByText(VIEW_ONLY_BANNER)).toBeNull();
  });

  it('switches to view-only when the window narrows', async () => {
    renderBoard();
    await screen.findByRole('button', { name: 'Actions for Middle' });

    act(() => setViewportWidth(PLOT_EDIT_MIN_WIDTH - 1));

    expect(screen.getByText(VIEW_ONLY_BANNER)).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Actions for/ })).toBeNull();
  });
});

describe('PlotBoard — filtered from the sidebar', () => {
  const [, ada] = MOCK_PLOTLINES;
  const [beginning, middle, end] = MOCK_PLOT_BEATS;
  const hide = (hiddenPlotlineIds: string[], hiddenBeatIds: string[]) =>
    localStorage.setItem(
      PLOT_VIEW_STORAGE_PREFIX + MOCK_PROJECT.id,
      JSON.stringify({ hiddenPlotlineIds, hiddenBeatIds })
    );

  const allPlotlineIds = MOCK_PLOTLINES.map((p) => p.id);
  const allBeatIds = MOCK_PLOT_BEATS.map((b) => b.id);

  it.each([
    ['every plotline', allPlotlineIds, []],
    ['every beat', [], allBeatIds],
  ])(
    'says everything is hidden when %s is',
    async (_, hiddenPlotlineIds, hiddenBeatIds) => {
      hide(hiddenPlotlineIds, hiddenBeatIds);
      renderBoard();

      expect(
        await screen.findByText('Everything is hidden.')
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('table', { name: 'Plot board' })
      ).not.toBeInTheDocument();
    }
  );

  it('Show all clears both filters and brings the board back', async () => {
    hide(allPlotlineIds, [middle.id]);
    renderBoard();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Show all' })
    );

    const grid = await screen.findByRole('table', { name: 'Plot board' });
    expect(within(grid).getAllByRole('rowheader')).toHaveLength(2);
    expect(within(grid).getAllByRole('columnheader')).toHaveLength(3);
  });

  // With no beats there is nothing to hide; the board keeps its usual
  // empty layout even if a stale hidden id is still stored.
  it('keeps the usual board for a plot with no beats', async () => {
    servePlot(MOCK_PLOTLINES, []);
    hide([], [middle.id]);
    renderBoard();

    expect(
      await screen.findByRole('table', { name: 'Plot board' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Everything is hidden.')).toBeNull();
  });

  it('leaves out hidden plotline rows and beat columns', async () => {
    hide([ada.id], [middle.id]);
    renderBoard();

    const grid = await screen.findByRole('table', { name: 'Plot board' });
    // The view atom outlives a test: it mounts holding the last test's view,
    // then reads storage, which the board animates like any filter change.
    await waitFor(
      () =>
        expect(
          within(grid)
            .getAllByRole('columnheader')
            .map((h) => h.textContent)
        ).toEqual(['Beginning', 'End']),
      { timeout: PLOT_FILTER_SETTLE_MS * 2 }
    );
    const labels = within(grid).getAllByRole('rowheader');
    expect(labels).toHaveLength(1);
    expect(labels[0]).toHaveTextContent('Main plot');
    // Each column takes its width from its cells, which animate it.
    expect(grid.style.gridTemplateColumns).toBe(
      `${PLOT_LABEL_COLUMN_WIDTH}px repeat(2, auto)`
    );
  });

  // Spec §8: a move swaps with a hidden neighbour, so the board looks
  // unchanged and the sidebar shows the change.
  it('moves a beat within the full order, past a hidden neighbour', async () => {
    hide([], [middle.id]);
    const { variables, release } = holdMutation('ReorderPlotBeats');
    renderBoard();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Actions for Beginning' })
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Move right' })
    );

    expect(variables).toHaveBeenCalledWith(
      expect.objectContaining({ ids: [middle.id, beginning.id, end.id] })
    );
    release();
  });

  describe('animating a filter change', () => {
    afterEach(() => vi.useRealTimers());

    async function renderFilterableBoard() {
      renderBoard(<ViewHandle />);
      await screen.findByRole('table', { name: 'Plot board' });
      vi.useFakeTimers();
    }
    const rowHeader = (name: string) =>
      screen.queryByRole('rowheader', { name: new RegExp(name) });
    const columnHeader = (name: string) =>
      screen.queryByRole('columnheader', { name });
    const isInert = (el: HTMLElement | null) => {
      expect(el).not.toBeNull();
      return el!.closest('[inert]') !== null;
    };
    const settle = () =>
      act(() => vi.advanceTimersByTime(PLOT_FILTER_SETTLE_MS));

    it('keeps a hidden plotline in place, out of reach, until it has folded away', async () => {
      await renderFilterableBoard();

      act(() => view.toggle('plotline', ada.id));

      expect(isInert(rowHeader('Ada'))).toBe(true);
      expect(isInert(rowHeader('Main plot'))).toBe(false);
      settle();
      expect(rowHeader('Ada')).toBeNull();
    });

    it('keeps a hidden beat in place, out of reach, until it has folded away', async () => {
      await renderFilterableBoard();

      act(() => view.toggle('beat', middle.id));

      expect(isInert(columnHeader('Middle'))).toBe(true);
      expect(isInert(columnHeader('End'))).toBe(false);
      expect(screen.getAllByRole('cell').filter(isInert)).toHaveLength(
        MOCK_PLOTLINES.length
      );
      settle();
      expect(columnHeader('Middle')).toBeNull();
    });

    // Content that changed as the fold began made the rows below jump.
    it('keeps a folding row exactly as it was', async () => {
      await renderFilterableBoard();
      const row = rowHeader('Ada')!.closest('[role="row"]') as HTMLElement;
      const before = within(row).getAllByRole('button').length;

      act(() => view.toggle('plotline', ada.id));

      expect(within(row).getAllByRole('button')).toHaveLength(before);
    });

    it('brings back a plotline shown again before it has folded away', async () => {
      await renderFilterableBoard();

      act(() => view.toggle('plotline', ada.id));
      act(() => view.toggle('plotline', ada.id));

      expect(screen.getAllByRole('rowheader', { name: /Ada/ })).toHaveLength(1);
      expect(isInert(rowHeader('Ada'))).toBe(false);
      settle();
      expect(isInert(rowHeader('Ada'))).toBe(false);
    });

    it('hides at once when the reader prefers reduced motion', async () => {
      const matchMedia = window.matchMedia;
      window.matchMedia = (query: string) =>
        query.includes('prefers-reduced-motion')
          ? ({ matches: true } as MediaQueryList)
          : matchMedia(query);
      await renderFilterableBoard();

      act(() => view.toggle('beat', middle.id));

      expect(columnHeader('Middle')).toBeNull();
    });
  });

  it('judges first and last by the full order', async () => {
    hide([], [end.id]);
    renderBoard();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Actions for Middle' })
    );

    expect(
      await screen.findByRole('menuitem', { name: 'Move right' })
    ).not.toHaveAttribute('aria-disabled', 'true');
  });
});
