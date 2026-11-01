import { describe, expect, it } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  holdMutation,
  renderBoard,
  servePlot,
} from '@web/features/plot/test/plot-board-harness';
import {
  PLOT_BEAT_COLUMN_WIDTH,
  PLOT_EDIT_MIN_WIDTH,
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
    expect(
      within(grid)
        .getAllByRole('columnheader')
        .map((h) => h.textContent)
    ).toEqual(['Beginning', 'End']);
    const labels = within(grid).getAllByRole('rowheader');
    expect(labels).toHaveLength(1);
    expect(labels[0]).toHaveTextContent('Main plot');
    expect(grid.style.gridTemplateColumns).toBe(
      `${PLOT_LABEL_COLUMN_WIDTH}px repeat(2, ${PLOT_BEAT_COLUMN_WIDTH}px)`
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
