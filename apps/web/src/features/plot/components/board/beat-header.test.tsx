import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  holdMutation,
  renderBoard,
} from '@web/features/plot/test/plot-board-harness';
import { MOCK_PLOT_BEATS } from '@web/test/mocks/fixtures';

const [BEGINNING, MIDDLE, END] = MOCK_PLOT_BEATS;

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

function columnNames() {
  return screen
    .getAllByRole('columnheader')
    .map((h) => within(h).queryByRole('textbox') ?? h.textContent);
}

describe('BeatHeader — menu', () => {
  it('keeps the actions trigger in the tab order', async () => {
    const user = userEvent.setup();
    renderBoard();
    await screen.findByRole('table', { name: 'Plot board' });

    const trigger = screen.getByRole('button', { name: 'Actions for Middle' });
    while (document.activeElement !== trigger) {
      await user.tab();
      if (document.activeElement === document.body) break;
    }
    expect(trigger).toHaveFocus();
  });

  it('lists the beat actions in order', async () => {
    const user = userEvent.setup();
    renderBoard();

    const menu = await openMenu(user, 'Middle');

    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((i) => i.textContent)
    ).toEqual(['Rename', 'Move left', 'Move right', 'Delete beat']);
  });

  it.each([
    ['Beginning', 'Move left'],
    ['End', 'Move right'],
  ])('disables %s at its end of the board', async (name, item) => {
    const user = userEvent.setup();
    renderBoard();

    await openMenu(user, name);

    expect(screen.getByRole('menuitem', { name: item })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it.each([
    ['Middle', 'Move left', [MIDDLE.id, BEGINNING.id, END.id]],
    ['Middle', 'Move right', [BEGINNING.id, END.id, MIDDLE.id]],
  ])('reorders %s → %s', async (name, item, ids) => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('ReorderPlotBeats');
    renderBoard();

    await choose(user, name, item);

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith(expect.objectContaining({ ids }))
    );
    const byId = new Map(MOCK_PLOT_BEATS.map((b) => [b.id, b.name]));
    expect(columnNames()).toEqual(ids.map((id) => byId.get(id)));
    release();
  });

  it('deletes the beat at once and confirms with a toast', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('DeletePlotBeat');
    renderBoard();

    await choose(user, 'Middle', 'Delete beat');

    await waitFor(() =>
      expect(screen.queryByRole('columnheader', { name: /Middle/ })).toBeNull()
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(variables).toHaveBeenCalledWith({ id: MIDDLE.id });
    release();
    expect(await screen.findByText('Deleted "Middle"')).toBeVisible();
  });
});

describe('BeatHeader — inline rename', () => {
  async function startRename(user: ReturnType<typeof userEvent.setup>) {
    await choose(user, 'Middle', 'Rename');
    const input = await screen.findByRole('textbox', { name: 'Beat name' });
    expect(input).toHaveValue('Middle');
    await waitFor(() => expect(input).toHaveFocus());
    return input;
  }

  it('commits on Enter', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('UpdatePlotBeat');
    renderBoard();

    const input = await startRename(user);
    await user.clear(input);
    await user.type(input, 'Midpoint{Enter}');

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({
        id: MIDDLE.id,
        patch: { name: 'Midpoint' },
      })
    );
    expect(
      screen.getByRole('columnheader', { name: /Midpoint/ })
    ).toBeInTheDocument();
    release();
  });

  it('commits on blur', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('UpdatePlotBeat');
    renderBoard();

    const input = await startRename(user);
    await user.clear(input);
    await user.type(input, 'Midpoint');
    await user.tab();

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({
        id: MIDDLE.id,
        patch: { name: 'Midpoint' },
      })
    );
    release();
  });

  it('cancels on Escape', async () => {
    const user = userEvent.setup();
    const { variables } = holdMutation('UpdatePlotBeat');
    renderBoard();

    const input = await startRename(user);
    await user.clear(input);
    await user.type(input, 'Midpoint{Escape}');

    expect(
      await screen.findByRole('columnheader', { name: /Middle/ })
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(variables).not.toHaveBeenCalled();
  });

  it('keeps the old name when emptied', async () => {
    const user = userEvent.setup();
    const { variables } = holdMutation('UpdatePlotBeat');
    renderBoard();

    const input = await startRename(user);
    await user.clear(input);
    await user.keyboard('{Enter}');

    expect(
      await screen.findByRole('columnheader', { name: /Middle/ })
    ).toBeInTheDocument();
    expect(variables).not.toHaveBeenCalled();
  });
});
