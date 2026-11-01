import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  failMutation,
  holdMutation,
  holdPlotRefetch,
  renderBoard,
  view,
  ViewHandle,
} from '@web/features/plot/test/plot-board-harness';
import {
  PLOT_EDIT_MIN_WIDTH,
  PLOT_FILTER_SETTLE_MS,
  PLOT_VIEW_STORAGE_PREFIX,
} from '@web/features/plot/constants/plot.constants';
import { setViewportWidth } from '@web/test/media';
import {
  MOCK_PLOTLINES,
  MOCK_PLOT_BEATS,
  MOCK_PLOT_CARDS,
  MOCK_PROJECT,
} from '@web/test/mocks/fixtures';

const [MAIN, ADA] = MOCK_PLOTLINES;
const [BEGINNING, MIDDLE, END] = MOCK_PLOT_BEATS;
const [LOGBOOK, UNTITLED, STORM] = MOCK_PLOT_CARDS;
const CELL = { width: 240, height: 300 };

function rect(left: number, top: number, width: number, height: number) {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect;
}

// jsdom has no layout, and dnd-kit finds targets by geometry: cells sit in a
// grid, cards stack inside them, and the fixed drag overlay sits where its
// inline position and transform put it.
function fixedAncestor(el: Element | null): HTMLElement | null {
  for (let node = el; node; node = node.parentElement) {
    if ((node as HTMLElement).style?.position === 'fixed') {
      return node as HTMLElement;
    }
  }
  return null;
}

function layout(el: Element): DOMRect {
  const overlay = fixedAncestor(el);
  if (overlay) {
    const { style } = overlay;
    const [, x = '0', y = '0'] =
      /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(style.transform) ?? [];
    return rect(
      parseFloat(style.left) + parseFloat(x),
      parseFloat(style.top) + parseFloat(y),
      parseFloat(style.width),
      parseFloat(style.height)
    );
  }
  const header = el.closest('[role="rowheader"], [role="columnheader"]');
  if (header) return headerRect(header);
  const cell = el.closest('[role="cell"]');
  if (!cell) return rect(0, 0, 0, 0);
  const row = cell.closest('[role="row"]')!;
  const rows = [...document.querySelectorAll('[role="row"]')].filter((r) =>
    r.querySelector('[role="cell"]')
  );
  const left =
    200 + [...row.querySelectorAll('[role="cell"]')].indexOf(cell) * CELL.width;
  const top = 50 + rows.indexOf(row) * CELL.height;
  if (el === cell) return rect(left, top, CELL.width, CELL.height);
  const cards = [...cell.querySelectorAll('[aria-roledescription="sortable"]')];
  const index = cards.indexOf(el);
  return index === -1
    ? rect(left + 8, top + CELL.height - 40, CELL.width - 16, 32)
    : rect(left + 8, top + 8 + index * 60, CELL.width - 16, 52);
}

// Labels sit left of their row's cells, beat headers above their column.
function headerRect(header: Element): DOMRect {
  const role = header.getAttribute('role');
  const all = [...document.querySelectorAll(`[role="${role}"]`)];
  const index = all.indexOf(header);
  return role === 'rowheader'
    ? rect(0, 50 + index * CELL.height, 200, CELL.height)
    : rect(200 + index * CELL.width, 0, CELL.width, 50);
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      return layout(this);
    }
  );
});

afterEach(() => vi.restoreAllMocks());

function cellOf(plotline: string, beatIndex: number) {
  const label = screen.getByRole('rowheader', { name: new RegExp(plotline) });
  const row = label.closest('[role="row"]') as HTMLElement;
  return within(row).getAllByRole('cell')[beatIndex];
}

function cardNames(cell: HTMLElement) {
  return within(cell)
    .queryAllByRole('button')
    .filter((b) => b.getAttribute('aria-roledescription') === 'sortable')
    .map((b) => b.getAttribute('aria-labelledby'))
    .map((id) => document.getElementById(id!)?.textContent);
}

async function pickUp(user: ReturnType<typeof userEvent.setup>, name: string) {
  const card = await screen.findByRole('button', { name });
  card.focus();
  await user.keyboard('[Space]');
  return card;
}

describe('PlotBoard — dragging cards with the keyboard', () => {
  it('announces the card and where it was picked up', async () => {
    const user = userEvent.setup();
    renderBoard();

    await pickUp(user, "The keeper's logbook");

    expect(
      await screen.findByText(
        "Picked up card 'The keeper's logbook' in Main plot, Beginning."
      )
    ).toBeInTheDocument();
  });

  it('moves a card to another cell and keeps focus on it', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('MovePlotCard');
    renderBoard();
    await screen.findByRole('table', { name: 'Plot board' });
    holdPlotRefetch();

    await pickUp(user, "The keeper's logbook");
    await user.keyboard('{ArrowRight}');
    await user.keyboard('[Space]');

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({
        id: LOGBOOK.id,
        plotlineId: MAIN.id,
        beatId: MIDDLE.id,
        orderedIds: expect.arrayContaining([LOGBOOK.id, STORM.id]),
      })
    );
    expect(cardNames(cellOf('Main plot', 0))).toEqual(['Untitled card']);
    expect(cardNames(cellOf('Main plot', 1))).toContain("The keeper's logbook");
    expect(
      screen.getByText(
        /^Card 'The keeper's logbook' was dropped in Main plot, Middle/
      )
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(cellOf('Main plot', 1)).getByRole('button', {
          name: "The keeper's logbook",
        })
      ).toHaveFocus()
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    release();
  });

  it('reorders within a cell', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('MovePlotCard');
    renderBoard();
    await screen.findByRole('table', { name: 'Plot board' });
    holdPlotRefetch();

    await pickUp(user, "The keeper's logbook");
    await user.keyboard('{ArrowDown}');
    await user.keyboard('[Space]');

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({
        id: LOGBOOK.id,
        plotlineId: MAIN.id,
        beatId: BEGINNING.id,
        orderedIds: [UNTITLED.id, LOGBOOK.id],
      })
    );
    expect(cardNames(cellOf('Main plot', 0))).toEqual([
      'Untitled card',
      "The keeper's logbook",
    ]);
    release();
  });

  it('cancels with Escape and leaves the card in place', async () => {
    const user = userEvent.setup();
    const { variables } = holdMutation('MovePlotCard');
    renderBoard();

    await pickUp(user, "The keeper's logbook");
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{Escape}');

    expect(
      await screen.findByText(
        "Moving card 'The keeper's logbook' was cancelled. It stays in Main plot, Beginning."
      )
    ).toBeInTheDocument();
    expect(variables).not.toHaveBeenCalled();
    expect(cardNames(cellOf('Main plot', 0))).toEqual([
      "The keeper's logbook",
      'Untitled card',
    ]);
  });

  it('rolls a failed move back and says so', async () => {
    const user = userEvent.setup();
    failMutation('MovePlotCard');
    renderBoard();

    await pickUp(user, "The keeper's logbook");
    await user.keyboard('{ArrowRight}');
    await user.keyboard('[Space]');

    expect(
      await screen.findByText("Couldn't save your plot. Try again.")
    ).toBeVisible();
    await waitFor(() =>
      expect(cardNames(cellOf('Main plot', 0))).toEqual([
        "The keeper's logbook",
        'Untitled card',
      ])
    );
  });

  it('still opens the editor with Enter', async () => {
    const user = userEvent.setup();
    renderBoard();

    (
      await screen.findByRole('button', { name: "The keeper's logbook" })
    ).focus();
    await user.keyboard('{Enter}');

    expect(
      await screen.findByRole('dialog', { name: 'Edit card' })
    ).toBeInTheDocument();
  });
});

describe('PlotBoard — dragging rows and columns with the keyboard', () => {
  function rowNames() {
    return screen
      .getAllByRole('rowheader')
      .map((h) => within(h).getByText(/^(Main plot|Ada)$/).textContent);
  }

  function columnNames() {
    return screen.getAllByRole('columnheader').map((h) => h.textContent);
  }

  it('reorders plotlines from the label’s drag handle', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('ReorderPlotlines');
    renderBoard();

    (await screen.findByRole('button', { name: 'Drag Main plot' })).focus();
    await user.keyboard('[Space]');
    expect(
      await screen.findByText(
        "Picked up plotline 'Main plot', position 1 of 2."
      )
    ).toBeInTheDocument();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('[Space]');

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith(
        expect.objectContaining({ ids: [ADA.id, MAIN.id] })
      )
    );
    expect(rowNames()).toEqual(['Ada', 'Main plot']);
    expect(
      screen.getByText("Plotline 'Main plot' was dropped at position 2 of 2.")
    ).toBeInTheDocument();
    release();
  });

  it('reorders beats from the header’s drag handle', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('ReorderPlotBeats');
    renderBoard();

    (await screen.findByRole('button', { name: 'Drag Beginning' })).focus();
    await user.keyboard('[Space]');
    await user.keyboard('{ArrowRight}');
    await user.keyboard('[Space]');

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith(
        expect.objectContaining({ ids: [MIDDLE.id, BEGINNING.id, END.id] })
      )
    );
    expect(columnNames()).toEqual(['Middle', 'Beginning', 'End']);
    release();
  });

  // Dropping onto the next visible column moves past the hidden one between
  // them, in the full order the server keeps.
  it('reorders beats in the full order when one is hidden', async () => {
    localStorage.setItem(
      PLOT_VIEW_STORAGE_PREFIX + MOCK_PROJECT.id,
      JSON.stringify({ hiddenPlotlineIds: [], hiddenBeatIds: [MIDDLE.id] })
    );
    const user = userEvent.setup();
    const { variables, release } = holdMutation('ReorderPlotBeats');
    renderBoard();

    (await screen.findByRole('button', { name: 'Drag Beginning' })).focus();
    await user.keyboard('[Space]');
    await user.keyboard('{ArrowRight}');
    await user.keyboard('[Space]');

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith(
        expect.objectContaining({ ids: [MIDDLE.id, END.id, BEGINNING.id] })
      )
    );
    // The view atom outlives a test: it mounts holding the last test's view,
    // then reads storage, which the board animates like any filter change.
    await waitFor(() => expect(columnNames()).toEqual(['End', 'Beginning']), {
      timeout: PLOT_FILTER_SETTLE_MS * 2,
    });
    release();
  });

  // The folding column still renders, full size, in its old place.
  it('skips a beat that is still folding away', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('ReorderPlotBeats');
    renderBoard(<ViewHandle />);
    const handle = await screen.findByRole('button', {
      name: 'Drag Beginning',
    });

    act(() => view.toggle('beat', MIDDLE.id));
    handle.focus();
    await user.keyboard('[Space]');
    await user.keyboard('{ArrowRight}');
    await user.keyboard('[Space]');

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith(
        expect.objectContaining({ ids: [MIDDLE.id, END.id, BEGINNING.id] })
      )
    );
    release();
  });

  it('cancels a row drag with Escape', async () => {
    const user = userEvent.setup();
    const { variables } = holdMutation('ReorderPlotlines');
    renderBoard();

    (await screen.findByRole('button', { name: 'Drag Main plot' })).focus();
    await user.keyboard('[Space]');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Escape}');

    expect(
      await screen.findByText(
        "Moving plotline 'Main plot' was cancelled. It stays at position 1 of 2."
      )
    ).toBeInTheDocument();
    expect(variables).not.toHaveBeenCalled();
    expect(rowNames()).toEqual(['Main plot', 'Ada']);
  });

  it('stays in focus mode when Escape cancels a drag', async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(
      await screen.findByRole('button', { name: 'Enter focus mode' })
    );

    screen.getByRole('button', { name: 'Drag Main plot' }).focus();
    await user.keyboard('[Space]');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Escape}');

    expect(
      await screen.findByText(/Moving plotline 'Main plot' was cancelled/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Leave focus mode' })
    ).toBeInTheDocument();
  });

  it('keeps cards out of row targets: a card dragged left of its cell stays put', async () => {
    const user = userEvent.setup();
    const { variables } = holdMutation('MovePlotCard');
    renderBoard();

    await pickUp(user, "The keeper's logbook");
    await user.keyboard('{ArrowLeft}');
    await user.keyboard('[Space]');

    expect(
      await screen.findByText(
        "Card 'The keeper's logbook' was dropped in Main plot, Beginning, position 1 of 2."
      )
    ).toBeInTheDocument();
    expect(variables).not.toHaveBeenCalled();
  });
});

describe('PlotBoard — view-only', () => {
  it('makes no card draggable', async () => {
    setViewportWidth(PLOT_EDIT_MIN_WIDTH - 1);
    renderBoard();

    const card = await screen.findByRole('button', {
      name: "The keeper's logbook",
    });
    expect(card).not.toHaveAttribute('aria-roledescription');
    expect(screen.queryByRole('button', { name: /^Drag / })).toBeNull();
  });
});
