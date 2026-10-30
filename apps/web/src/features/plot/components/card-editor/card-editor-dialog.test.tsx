import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  failMutation,
  holdMutation,
  holdPlotRefetch,
  renderBoard,
} from '@web/features/plot/test/plot-board-harness';
import {
  PLOT_CARD_DRAG_INSTRUCTIONS,
  PLOT_EDIT_MIN_WIDTH,
} from '@web/features/plot/constants/plot.constants';
import { setViewportWidth } from '@web/test/media';
import {
  MOCK_PLOTLINES,
  MOCK_PLOT_BEATS,
  MOCK_PLOT_CARDS,
} from '@web/test/mocks/fixtures';

const [MAIN] = MOCK_PLOTLINES;
const [, , END] = MOCK_PLOT_BEATS;
const [LOGBOOK] = MOCK_PLOT_CARDS;

async function addCardInMainEnd() {
  const label = await screen.findByRole('rowheader', { name: /Main plot/ });
  const row = label.closest('[role="row"]') as HTMLElement;
  return within(within(row).getAllByRole('cell')[2]).getByRole('button', {
    name: 'Add card',
  });
}

function editor() {
  return screen.getByRole('dialog', { name: 'Edit card' });
}

describe('CardEditorDialog — opening', () => {
  it('opens a clicked card filled in, with its context and Title focused', async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(
      await screen.findByRole('button', { name: "The keeper's logbook" })
    );

    const dialog = await screen.findByRole('dialog', { name: 'Edit card' });
    expect(dialog).toHaveAccessibleDescription('Main plot · Beginning');
    const title = within(dialog).getByRole('textbox', { name: 'Title' });
    expect(title).toHaveValue(LOGBOOK.title);
    expect(
      within(dialog).getByRole('textbox', { name: 'Description (optional)' })
    ).toHaveValue(LOGBOOK.description);
    await waitFor(() => expect(title).toHaveFocus());
  });

  it('opens a card with Enter', async () => {
    const user = userEvent.setup();
    renderBoard();

    (
      await screen.findByRole('button', {
        name: 'Ada leaves on the first ferry',
      })
    ).focus();
    await user.keyboard('{Enter}');

    expect(
      within(
        await screen.findByRole('dialog', { name: 'Edit card' })
      ).getByRole('textbox', { name: 'Title' })
    ).toHaveValue('Ada leaves on the first ferry');
    expect(editor()).toHaveAccessibleDescription('Ada · End');
  });

  it('opens Add card empty, placed in its cell', async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(await addCardInMainEnd());

    const dialog = await screen.findByRole('dialog', { name: 'Edit card' });
    expect(dialog).toHaveAccessibleDescription('Main plot · End');
    expect(within(dialog).getByRole('textbox', { name: 'Title' })).toHaveValue(
      ''
    );
    expect(
      within(dialog).getByRole('textbox', { name: 'Description (optional)' })
    ).toHaveValue('');
  });
});

describe('CardEditorDialog — saving', () => {
  it('creates the card in its cell and returns focus to Add card', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('CreatePlotCard');
    renderBoard();
    const add = await addCardInMainEnd();
    holdPlotRefetch();

    await user.click(add);
    await user.type(
      screen.getByRole('textbox', { name: 'Title' }),
      'The lamp goes dark'
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Description (optional)' }),
      'Who turned it off?'
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(variables).toHaveBeenCalledWith(
      expect.objectContaining({
        plotlineId: MAIN.id,
        beatId: END.id,
        title: 'The lamp goes dark',
        description: 'Who turned it off?',
        position: 0,
      })
    );
    release();

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      screen.getByRole('button', {
        name: 'The lamp goes dark',
        description: `Who turned it off? ${PLOT_CARD_DRAG_INSTRUCTIONS}`,
      })
    ).toBeInTheDocument();
    await waitFor(() => expect(add).toHaveFocus());
  });

  it('updates the card and returns focus to it', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('UpdatePlotCard');
    renderBoard();
    const card = await screen.findByRole('button', {
      name: "The keeper's logbook",
    });
    holdPlotRefetch();

    await user.click(card);
    const title = screen.getByRole('textbox', { name: 'Title' });
    await user.clear(title);
    await user.type(title, 'The logbook');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(variables).toHaveBeenCalledWith({
      id: LOGBOOK.id,
      patch: { title: 'The logbook', description: LOGBOOK.description },
    });
    release();

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const renamed = screen.getByRole('button', { name: 'The logbook' });
    await waitFor(() => expect(renamed).toHaveFocus());
  });

  it('stays open with the text kept when the save fails', async () => {
    const user = userEvent.setup();
    failMutation('UpdatePlotCard');
    renderBoard();

    await user.click(
      await screen.findByRole('button', { name: "The keeper's logbook" })
    );
    const title = screen.getByRole('textbox', { name: 'Title' });
    await user.clear(title);
    await user.type(title, 'Unsaved idea');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await within(editor()).findByRole('alert')).toHaveTextContent(
      "Couldn't save the card — try again."
    );
    expect(
      await screen.findByText("Couldn't save your plot. Try again.")
    ).toBeVisible();
    expect(title).toHaveValue('Unsaved idea');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});

describe('CardEditorDialog — closing', () => {
  it('closes at once on Cancel when nothing changed', async () => {
    const user = userEvent.setup();
    renderBoard();
    const card = await screen.findByRole('button', {
      name: "The keeper's logbook",
    });

    await user.click(card);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(card).toHaveFocus());
  });

  it.each([
    [
      'Cancel',
      (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole('button', { name: 'Cancel' })),
    ],
    [
      'Escape',
      (user: ReturnType<typeof userEvent.setup>) => user.keyboard('{Escape}'),
    ],
  ])('asks "Discard changes?" on %s with unsaved changes', async (_, close) => {
    const user = userEvent.setup();
    const { variables } = holdMutation('UpdatePlotCard');
    renderBoard();

    const card = await screen.findByRole('button', {
      name: "The keeper's logbook",
    });
    await user.click(card);
    const title = screen.getByRole('textbox', { name: 'Title' });
    await user.type(title, '!');
    await close(user);

    expect(within(editor()).getByText('Discard changes?')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Keep editing' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(title).toHaveValue("The keeper's logbook!");
    expect(title).toHaveFocus();

    await close(user);
    await user.click(screen.getByRole('button', { name: 'Discard' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(variables).not.toHaveBeenCalled();
    await waitFor(() => expect(card).toHaveFocus());
  });
});

describe('CardEditorDialog — view-only', () => {
  it('opens cards read-only, without Save', async () => {
    const user = userEvent.setup();
    setViewportWidth(PLOT_EDIT_MIN_WIDTH - 1);
    renderBoard();

    await user.click(
      await screen.findByRole('button', { name: "The keeper's logbook" })
    );

    const dialog = await screen.findByRole('dialog', { name: 'Edit card' });
    expect(
      within(dialog).getByRole('textbox', { name: 'Title' })
    ).toHaveAttribute('readonly');
    expect(
      within(dialog).getByRole('textbox', { name: 'Description (optional)' })
    ).toHaveAttribute('readonly');
    expect(within(dialog).queryByRole('button', { name: 'Save' })).toBeNull();
  });
});

describe('CardEditorDialog — delete', () => {
  it('offers Delete only on an existing card', async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(await addCardInMainEnd());
    expect(
      within(editor()).queryByRole('button', { name: 'Delete' })
    ).toBeNull();
  });

  it('confirms inline, and Keep goes back', async () => {
    const user = userEvent.setup();
    const { variables } = holdMutation('DeletePlotCard');
    renderBoard();

    await user.click(
      await screen.findByRole('button', { name: "The keeper's logbook" })
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      within(editor()).getByText("Delete this card? This can't be undone.")
    ).toBeVisible();
    const keep = screen.getByRole('button', { name: 'Keep' });
    expect(keep).toHaveFocus();
    await user.click(keep);

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Save' })).toBeVisible();
    expect(variables).not.toHaveBeenCalled();
  });

  it('deletes the card and returns focus to Add card in its cell', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('DeletePlotCard');
    renderBoard();
    const card = await screen.findByRole('button', {
      name: 'Ada leaves on the first ferry',
    });
    const cell = card.closest('[role="cell"]') as HTMLElement;
    holdPlotRefetch();

    await user.click(card);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete card' }));

    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    expect(variables).toHaveBeenCalledWith({ id: MOCK_PLOT_CARDS[3].id });
    release();

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      screen.queryByRole('button', { name: 'Ada leaves on the first ferry' })
    ).toBeNull();
    await waitFor(() =>
      expect(
        within(cell).getByRole('button', { name: 'Add card' })
      ).toHaveFocus()
    );
  });

  it('stays open when the delete fails', async () => {
    const user = userEvent.setup();
    failMutation('DeletePlotCard');
    renderBoard();

    await user.click(
      await screen.findByRole('button', { name: "The keeper's logbook" })
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete card' }));

    expect(await within(editor()).findByRole('alert')).toHaveTextContent(
      "Couldn't delete the card — try again."
    );
    expect(
      await screen.findByText("Couldn't save your plot. Try again.")
    ).toBeVisible();
  });

  it('has no Delete when view-only', async () => {
    const user = userEvent.setup();
    setViewportWidth(PLOT_EDIT_MIN_WIDTH - 1);
    renderBoard();

    await user.click(
      await screen.findByRole('button', { name: "The keeper's logbook" })
    );
    expect(
      within(editor()).queryByRole('button', { name: 'Delete' })
    ).toBeNull();
  });
});
