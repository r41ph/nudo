import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  holdMutation,
  renderBoard,
  servePlot,
} from '@web/features/plot/test/plot-board-harness';
import {
  MOCK_PLOTLINES,
  MOCK_PLOT_BEATS,
  MOCK_PLOT_CARDS,
} from '@web/test/mocks/fixtures';

const [MAIN, ADA] = MOCK_PLOTLINES;

async function openMenu(
  user: ReturnType<typeof userEvent.setup>,
  name: string
) {
  await user.click(
    await screen.findByRole('button', { name: `Actions for ${name}` })
  );
  return screen.findByRole('menu');
}

async function choose(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  item: string
) {
  await openMenu(user, name);
  await user.click(await screen.findByRole('menuitem', { name: item }));
}

function rowNames() {
  return screen
    .getAllByRole('rowheader')
    .map((h) => within(h).queryByRole('textbox') ?? h.textContent);
}

describe('PlotlineLabel — menu', () => {
  it('keeps the actions trigger in the tab order', async () => {
    const user = userEvent.setup();
    renderBoard();
    await screen.findByRole('table', { name: 'Plot board' });

    const trigger = screen.getByRole('button', { name: 'Actions for Ada' });
    while (document.activeElement !== trigger) {
      await user.tab();
      if (document.activeElement === document.body) break;
    }
    expect(trigger).toHaveFocus();
  });

  it('lists the plotline actions in order', async () => {
    const user = userEvent.setup();
    renderBoard();

    const menu = await openMenu(user, 'Ada');

    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((i) => i.textContent)
    ).toEqual(['Rename', 'Colour', 'Move up', 'Move down', 'Delete plotline']);
  });

  it.each([
    ['Main plot', 'Move up'],
    ['Ada', 'Move down'],
  ])('disables %s at its end of the board', async (name, item) => {
    const user = userEvent.setup();
    renderBoard();

    await openMenu(user, name);

    expect(screen.getByRole('menuitem', { name: item })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('offers every named colour with the current one checked', async () => {
    const user = userEvent.setup();
    renderBoard();

    await choose(user, 'Main plot', 'Colour');

    const swatches = await screen.findAllByRole('menuitemradio');
    expect(swatches.map((s) => s.textContent)).toEqual([
      'Red',
      'Orange',
      'Brown',
      'Green',
      'Black',
      'Blue',
      'Violet',
      'Pink',
    ]);
    expect(screen.getByRole('menuitemradio', { name: 'Red' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('recolours the plotline', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('UpdatePlotline');
    renderBoard();

    await choose(user, 'Main plot', 'Colour');
    // Under jsdom a click on a submenu item never selects it; the keyboard
    // path does.
    (await screen.findByRole('menuitemradio', { name: 'Pink' })).focus();
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({
        id: MAIN.id,
        patch: { color: 'color8' },
      })
    );
    await openMenu(user, 'Main plot');
    await user.click(screen.getByRole('menuitem', { name: 'Colour' }));
    expect(
      await screen.findByRole('menuitemradio', { name: 'Pink' })
    ).toHaveAttribute('aria-checked', 'true');
    release();
  });

  it.each([
    ['Main plot', 'Move down'],
    ['Ada', 'Move up'],
  ])('reorders from %s → %s', async (name, item) => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('ReorderPlotlines');
    renderBoard();

    await choose(user, name, item);

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith(
        expect.objectContaining({ ids: [ADA.id, MAIN.id] })
      )
    );
    expect(rowNames().map((n) => String(n).replace(/\d+ cards?$/, ''))).toEqual(
      ['Ada', 'Main plot']
    );
    release();
  });

  it('deletes an empty plotline at once and confirms with a toast', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('DeletePlotline');
    servePlot(MOCK_PLOTLINES, MOCK_PLOT_BEATS);
    renderBoard();

    await choose(user, 'Main plot', 'Delete plotline');

    await waitFor(() =>
      expect(screen.queryByRole('rowheader', { name: /Main plot/ })).toBeNull()
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(variables).toHaveBeenCalledWith({ id: MAIN.id });
    release();
    expect(await screen.findByText('Deleted "Main plot"')).toBeVisible();
  });

  it('disables Delete plotline on a row with cards, saying why', async () => {
    const user = userEvent.setup();
    const { variables } = holdMutation('DeletePlotline');
    servePlot(MOCK_PLOTLINES, MOCK_PLOT_BEATS, [MOCK_PLOT_CARDS[3]]);
    renderBoard();

    const mainMenu = await openMenu(user, 'Main plot');
    expect(
      within(mainMenu).getByRole('menuitem', { name: 'Delete plotline' })
    ).not.toHaveAttribute('aria-disabled');
    await user.keyboard('{Escape}');

    const adaMenu = await openMenu(user, 'Ada');
    const item = within(adaMenu).getByRole('menuitem', {
      name: 'Delete plotline',
    });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(item).toHaveAccessibleDescription('Move or delete its cards first');

    await user.click(item);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('rowheader', { name: /Ada/ })).toBeInTheDocument();
    expect(variables).not.toHaveBeenCalled();
  });
});

describe('PlotlineLabel — inline rename', () => {
  async function startRename(user: ReturnType<typeof userEvent.setup>) {
    await choose(user, 'Main plot', 'Rename');
    const input = await screen.findByRole('textbox', {
      name: 'Plotline name',
    });
    expect(input).toHaveValue('Main plot');
    await waitFor(() => expect(input).toHaveFocus());
    return input;
  }

  it('commits on Enter', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('UpdatePlotline');
    renderBoard();

    const input = await startRename(user);
    await user.clear(input);
    await user.type(input, 'The heist{Enter}');

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({
        id: MAIN.id,
        patch: { name: 'The heist' },
      })
    );
    expect(
      screen.getByRole('rowheader', { name: /The heist/ })
    ).toBeInTheDocument();
    release();
  });

  it('commits on blur', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('UpdatePlotline');
    renderBoard();

    const input = await startRename(user);
    await user.clear(input);
    await user.type(input, 'The heist');
    await user.tab();

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({
        id: MAIN.id,
        patch: { name: 'The heist' },
      })
    );
    release();
  });

  it('cancels on Escape', async () => {
    const user = userEvent.setup();
    const { variables } = holdMutation('UpdatePlotline');
    renderBoard();

    const input = await startRename(user);
    await user.clear(input);
    await user.type(input, 'The heist{Escape}');

    expect(
      await screen.findByRole('rowheader', { name: /Main plot/ })
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(variables).not.toHaveBeenCalled();
  });

  it('keeps the old name when emptied', async () => {
    const user = userEvent.setup();
    const { variables } = holdMutation('UpdatePlotline');
    renderBoard();

    const input = await startRename(user);
    await user.clear(input);
    await user.keyboard('{Enter}');

    expect(
      await screen.findByRole('rowheader', { name: /Main plot/ })
    ).toBeInTheDocument();
    expect(variables).not.toHaveBeenCalled();
  });

  it('shows no card count beside the name', async () => {
    renderBoard();

    const header = await screen.findByRole('rowheader', { name: /Main plot/ });

    expect(within(header).queryByText(/\d+ cards?/)).toBeNull();
  });
});
