import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  holdMutation,
  renderBoard,
  servePlot,
} from '@web/features/plot/test/plot-board-harness';
import { MOCK_PLOTLINES, MOCK_PLOT_BEATS } from '@web/test/mocks/fixtures';

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
