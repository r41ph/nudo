import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  holdMutation,
  holdPlotRefetch,
  renderBoard,
} from '@web/features/plot/test/plot-board-harness';
import { PLOT_EDIT_MIN_WIDTH } from '@web/features/plot/constants/plot.constants';
import { setViewportWidth } from '@web/test/media';
import {
  MOCK_PLOTLINES,
  MOCK_PLOT_BEATS,
  MOCK_PLOT_CARDS,
} from '@web/test/mocks/fixtures';

const [MAIN, ADA] = MOCK_PLOTLINES;
const [BEGINNING, MIDDLE] = MOCK_PLOT_BEATS;
const [LOGBOOK, , STORM] = MOCK_PLOT_CARDS;

async function openLogbook(user: ReturnType<typeof userEvent.setup>) {
  const card = await screen.findByRole('button', {
    name: "The keeper's logbook",
  });
  await user.click(card);
  return screen.findByRole('dialog', { name: 'Edit card' });
}

async function pick(
  user: ReturnType<typeof userEvent.setup>,
  picker: RegExp,
  option: string
) {
  await user.click(screen.getByRole('button', { name: picker }));
  await user.click(await screen.findByRole('menuitemradio', { name: option }));
}

function cellOf(plotline: string, beatIndex: number) {
  const label = screen.getByRole('rowheader', { name: new RegExp(plotline) });
  const row = label.closest('[role="row"]') as HTMLElement;
  return within(row).getAllByRole('cell')[beatIndex];
}

describe('CardLocation', () => {
  it("shows the card's plotline and beat, with the current one checked", async () => {
    const user = userEvent.setup();
    renderBoard();
    const dialog = await openLogbook(user);

    expect(
      within(dialog).getByRole('button', { name: 'Plotline: Main plot' })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Beat: Beginning' })
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: 'Plotline: Main plot' })
    );
    const options = await screen.findAllByRole('menuitemradio');
    expect(options.map((o) => o.textContent)).toEqual(['Main plot', 'Ada']);
    expect(
      screen.getByRole('menuitemradio', { name: 'Main plot' })
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('moves the card on Save, to the end of the chosen cell', async () => {
    const user = userEvent.setup();
    const update = holdMutation('UpdatePlotCard');
    const move = holdMutation('MovePlotCard');
    renderBoard();
    const dialog = await openLogbook(user);
    holdPlotRefetch();

    await pick(user, /^Beat:/, 'Middle');
    expect(dialog).toHaveAccessibleDescription('Main plot · Middle');
    expect(
      within(dialog).getByRole('button', { name: 'Beat: Middle' })
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(move.variables).toHaveBeenCalledWith({
        id: LOGBOOK.id,
        plotlineId: MAIN.id,
        beatId: MIDDLE.id,
        orderedIds: [STORM.id, LOGBOOK.id],
      })
    );
    expect(update.variables).not.toHaveBeenCalled();
    move.release();

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const moved = within(cellOf('Main plot', 1)).getByRole('button', {
      name: "The keeper's logbook",
    });
    await waitFor(() => expect(moved).toHaveFocus());
  });

  it('saves the text first, then moves', async () => {
    const user = userEvent.setup();
    const update = holdMutation('UpdatePlotCard');
    const move = holdMutation('MovePlotCard');
    renderBoard();
    const dialog = await openLogbook(user);
    holdPlotRefetch();

    await user.type(
      within(dialog).getByRole('textbox', { name: 'Title' }),
      '!'
    );
    await pick(user, /^Plotline:/, 'Ada');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(update.variables).toHaveBeenCalled());
    expect(move.variables).not.toHaveBeenCalled();
    update.release();
    await waitFor(() =>
      expect(move.variables).toHaveBeenCalledWith(
        expect.objectContaining({ plotlineId: ADA.id, beatId: BEGINNING.id })
      )
    );
    move.release();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('places a new card in the chosen cell', async () => {
    const user = userEvent.setup();
    const create = holdMutation('CreatePlotCard');
    renderBoard();
    await screen.findByRole('table', { name: 'Plot board' });

    await user.click(
      within(cellOf('Ada', 0)).getByRole('button', { name: 'Add card' })
    );
    await pick(user, /^Beat:/, 'Middle');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(create.variables).toHaveBeenCalledWith(
        expect.objectContaining({
          plotlineId: ADA.id,
          beatId: MIDDLE.id,
          position: 0,
        })
      )
    );
    create.release();
  });

  it('counts a location change as unsaved', async () => {
    const user = userEvent.setup();
    renderBoard();
    await openLogbook(user);

    await pick(user, /^Plotline:/, 'Ada');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Discard changes?')).toBeVisible();
  });

  it('is disabled when view-only', async () => {
    const user = userEvent.setup();
    setViewportWidth(PLOT_EDIT_MIN_WIDTH - 1);
    renderBoard();
    const dialog = await openLogbook(user);

    expect(
      within(dialog).getByRole('button', { name: 'Plotline: Main plot' })
    ).toBeDisabled();
    expect(
      within(dialog).getByRole('button', { name: 'Beat: Beginning' })
    ).toBeDisabled();
  });
});
