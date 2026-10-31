import { describe, expect, it } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  holdMutation,
  renderBoard,
} from '@web/features/plot/test/plot-board-harness';
import { PLOT_EDIT_MIN_WIDTH } from '@web/features/plot/constants/plot.constants';
import { setViewportWidth } from '@web/test/media';

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
    [
      ['Main plot', '3 cards'],
      ['Ada', '1 card'],
    ].forEach(([name, count], i) => {
      expect(within(labels[i]).getByText(name)).toBeVisible();
      expect(within(labels[i]).getByText(count)).toBeVisible();
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
