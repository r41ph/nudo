import { describe, expect, it } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  holdMutation,
  renderBoard,
  servePlot,
} from '@web/features/plot/test/plot-board-harness';
import { PLOT_EDIT_MIN_WIDTH } from '@web/features/plot/constants/plot.constants';
import { setViewportWidth } from '@web/test/media';
import { MOCK_PLOTLINES, MOCK_PLOT_BEATS } from '@web/test/mocks/fixtures';

const VIEW_ONLY_BANNER =
  'View only — open nudo on a larger screen to edit the plot.';

describe('PlotBoard', () => {
  it('shows the title and a plural summary', async () => {
    renderBoard();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Plot' })
    ).toBeInTheDocument();
    expect(screen.getByText('2 plotlines · 3 beats · 0 cards')).toBeVisible();
  });

  it('uses the singular for one plotline and one beat', async () => {
    servePlot([MOCK_PLOTLINES[0]], [MOCK_PLOT_BEATS[0]]);
    renderBoard();

    expect(
      await screen.findByText('1 plotline · 1 beat · 0 cards')
    ).toBeVisible();
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
      expect(within(labels[i]).getByText('0 cards')).toBeVisible();
    });
  });

  it('adds an "Untitled beat" column from Add beat', async () => {
    const { variables, release } = holdMutation('CreatePlotBeat');
    renderBoard();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Add beat' })
    );

    expect(
      await screen.findByRole('columnheader', { name: 'Untitled beat' })
    ).toBeInTheDocument();
    expect(variables).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Untitled beat', position: 3 })
    );
    release();
  });

  it.each(['Add plotline', 'Plotline'])(
    'adds an "Untitled plotline" row with the next colour from %s',
    async (button) => {
      const { variables, release } = holdMutation('CreatePlotline');
      renderBoard();

      await userEvent.click(
        await screen.findByRole('button', { name: button })
      );

      expect(
        await screen.findByRole('rowheader', { name: /Untitled plotline/ })
      ).toBeInTheDocument();
      expect(variables).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Untitled plotline',
          color: 'plum',
          position: 2,
        })
      );
      release();
    }
  );
});

describe('PlotBoard — below PLOT_EDIT_MIN_WIDTH', () => {
  it('is view-only: a banner, no add buttons and no menus', async () => {
    setViewportWidth(PLOT_EDIT_MIN_WIDTH - 1);
    renderBoard();

    const grid = await screen.findByRole('table', { name: 'Plot board' });
    expect(screen.getByText(VIEW_ONLY_BANNER)).toBeVisible();
    for (const name of ['Add beat', 'Add plotline', 'Plotline']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
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
      await screen.findByRole('button', { name: 'Add beat' })
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
