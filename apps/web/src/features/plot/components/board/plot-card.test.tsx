import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderBoard,
  servePlot,
} from '@web/features/plot/test/plot-board-harness';
import {
  PLOT_DRAG_INSTRUCTIONS,
  PLOT_EDIT_MIN_WIDTH,
} from '@web/features/plot/constants/plot.constants';
import { setViewportWidth } from '@web/test/media';
import {
  MOCK_PLOTLINES,
  MOCK_PLOT_BEATS,
  MOCK_PLOT_CARDS,
} from '@web/test/mocks/fixtures';

async function cellsOf(plotline: string) {
  const label = await screen.findByRole('rowheader', {
    name: new RegExp(plotline),
  });
  const row = label.closest('[role="row"]') as HTMLElement;
  return within(row).getAllByRole('cell');
}

function expectCards(cell: HTMLElement, titles: string[]) {
  const cards = within(cell)
    .queryAllByRole('button')
    .filter((button) => button.textContent !== 'Add card');
  expect(cards).toHaveLength(titles.length);
  cards.forEach((card, i) => expect(card).toHaveAccessibleName(titles[i]));
}

describe('PlotCell', () => {
  it('puts each card in its plotline × beat cell, in position order', async () => {
    servePlot(MOCK_PLOTLINES, MOCK_PLOT_BEATS, [
      MOCK_PLOT_CARDS[1],
      MOCK_PLOT_CARDS[0],
      MOCK_PLOT_CARDS[2],
      MOCK_PLOT_CARDS[3],
    ]);
    renderBoard();

    const main = await cellsOf('Main plot');
    expect(main).toHaveLength(3);
    expectCards(main[0], ["The keeper's logbook", 'Untitled card']);
    expectCards(main[1], [MOCK_PLOT_CARDS[2].title]);
    expectCards(main[2], []);
    const ada = await cellsOf('Ada');
    expectCards(ada[0], []);
    expectCards(ada[1], []);
    expectCards(ada[2], ['Ada leaves on the first ferry']);
  });

  it('offers Add card in every cell, reachable by keyboard', async () => {
    const user = userEvent.setup();
    renderBoard();

    const [, , empty] = await cellsOf('Main plot');
    const add = within(empty).getByRole('button', { name: 'Add card' });
    expect(screen.getAllByRole('button', { name: 'Add card' })).toHaveLength(6);

    while (document.activeElement !== add) {
      await user.tab();
      if (document.activeElement === document.body) break;
    }
    expect(add).toHaveFocus();
  });

  it('has no Add card when view-only, but cards stay buttons', async () => {
    setViewportWidth(PLOT_EDIT_MIN_WIDTH - 1);
    renderBoard();

    const [beginning] = await cellsOf('Main plot');
    expect(screen.queryByRole('button', { name: 'Add card' })).toBeNull();
    expectCards(beginning, ["The keeper's logbook", 'Untitled card']);
  });
});

describe('PlotCard', () => {
  it('is named by its title and described by its description', async () => {
    renderBoard();

    expect(
      await screen.findByRole('button', {
        name: "The keeper's logbook",
        description: `Ada finds the last entry torn out. ${PLOT_DRAG_INSTRUCTIONS}`,
      })
    ).toBeVisible();
  });

  it('names an untitled card "Untitled card"', async () => {
    renderBoard();

    expect(
      await screen.findByRole('button', {
        name: 'Untitled card',
        description: `Mother already knew? Maybe before the inquiry. ${PLOT_DRAG_INSTRUCTIONS}`,
      })
    ).toBeVisible();
  });

  it('is described only by the drag instructions when it has no description', async () => {
    renderBoard();

    expect(
      await screen.findByRole('button', {
        name: 'Ada leaves on the first ferry',
      })
    ).toHaveAccessibleDescription(PLOT_DRAG_INSTRUCTIONS);
  });

  it('has no description at all when view-only and without one', async () => {
    setViewportWidth(PLOT_EDIT_MIN_WIDTH - 1);
    renderBoard();

    expect(
      await screen.findByRole('button', {
        name: 'Ada leaves on the first ferry',
      })
    ).not.toHaveAccessibleDescription();
  });
});
