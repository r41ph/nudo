import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'sonner';
import { PlotBoard } from '@web/features/plot/components/board/plot-board';
import { PlotSidebarPanel } from '@web/features/plot/components/sidebar/plot-sidebar-panel';
import {
  PLOT_EDIT_MIN_WIDTH,
  PLOT_SAVE_ERROR,
  PLOT_VIEW_STORAGE_PREFIX,
} from '@web/features/plot/constants/plot.constants';
import { usePlot } from '@web/features/plot/hooks/use-plot';
import {
  failMutation,
  holdMutation,
} from '@web/features/plot/test/plot-board-harness';
import { setViewportWidth } from '@web/test/media';
import {
  MOCK_PLOTLINES,
  MOCK_PLOT_BEATS,
  MOCK_PROJECT,
} from '@web/test/mocks/fixtures';
import { renderWithProviders } from '@web/test/test-utils';

const [MAIN, ADA] = MOCK_PLOTLINES;
const [BEGINNING, MIDDLE, END] = MOCK_PLOT_BEATS;
const ROW = { width: 260, height: 34 };

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

// jsdom has no layout, and dnd-kit finds targets by geometry: each section's
// rows stack in their own column band, and the fixed drag overlay sits where
// its inline position and transform put it.
function layout(el: Element): DOMRect {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const { style } = node as HTMLElement;
    if (style?.position !== 'fixed') continue;
    const [, x = '0', y = '0'] =
      /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(style.transform) ?? [];
    return rect(
      parseFloat(style.left) + parseFloat(x),
      parseFloat(style.top) + parseFloat(y),
      parseFloat(style.width),
      parseFloat(style.height)
    );
  }
  const row = el.closest('section li');
  if (!row) return rect(0, 0, 0, 0);
  const section = row.closest('section')!;
  const band = [...document.querySelectorAll('section')].indexOf(section);
  const index = [...row.parentElement!.children].indexOf(row);
  return rect(0, band * 1000 + index * ROW.height, ROW.width, ROW.height);
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      return layout(this);
    }
  );
});

afterEach(() => vi.restoreAllMocks());

function Board() {
  const { data } = usePlot(MOCK_PROJECT.id);
  return data ? <PlotBoard projectId={MOCK_PROJECT.id} plot={data} /> : null;
}

function renderPlot() {
  return renderWithProviders(
    <>
      <PlotSidebarPanel />
      <Board />
      <Toaster />
    </>,
    {
      initialRoute: `/project/${MOCK_PROJECT.id}/plot`,
      routePath: '/project/:projectId/plot',
    }
  );
}

function hide(view: {
  hiddenPlotlineIds?: string[];
  hiddenBeatIds?: string[];
}) {
  localStorage.setItem(
    PLOT_VIEW_STORAGE_PREFIX + MOCK_PROJECT.id,
    JSON.stringify({ hiddenPlotlineIds: [], hiddenBeatIds: [], ...view })
  );
}

const listNames = (name: 'Plotlines' | 'Beats') =>
  within(screen.getByRole('list', { name }))
    .getAllByRole('checkbox')
    .map((box) => box.getAttribute('aria-label')!.replace(/^Show /, ''));

const rowOf = (name: string) =>
  screen.getByRole('checkbox', { name: `Show ${name}` }).closest('li')!;

const boardRows = () =>
  screen
    .getAllByRole('rowheader')
    .map((h) => within(h).getByText(/^(Main plot|Ada)$/).textContent);

const boardColumns = () =>
  screen.getAllByRole('columnheader').map((h) => h.textContent);

// The board has a handle with the same name; the sidebar's is in its list.
async function pickUp(
  user: ReturnType<typeof userEvent.setup>,
  list: 'Plotlines' | 'Beats',
  name: string
) {
  const handle = within(
    await screen.findByRole('list', { name: list })
  ).getByRole('button', { name: `Drag ${name}` });
  handle.focus();
  await user.keyboard('[Space]');
}

describe('PlotSidebarPanel — reordering', () => {
  it('reorders plotlines from a row’s handle, and the board follows', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('ReorderPlotlines');
    renderPlot();
    await screen.findByRole('table', { name: 'Plot board' });

    await pickUp(user, 'Plotlines', 'Main plot');
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
    expect(listNames('Plotlines')).toEqual(['Ada', 'Main plot']);
    expect(boardRows()).toEqual(['Ada', 'Main plot']);
    expect(
      screen.getByText("Plotline 'Main plot' was dropped at position 2 of 2.")
    ).toBeInTheDocument();
    release();
  });

  it('reorders beats, and the board follows', async () => {
    const user = userEvent.setup();
    const { variables, release } = holdMutation('ReorderPlotBeats');
    renderPlot();
    await screen.findByRole('table', { name: 'Plot board' });

    await pickUp(user, 'Beats', 'End');
    await user.keyboard('{ArrowUp}');
    await user.keyboard('[Space]');

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith(
        expect.objectContaining({ ids: [BEGINNING.id, END.id, MIDDLE.id] })
      )
    );
    expect(listNames('Beats')).toEqual(['Beginning', 'End', 'Middle']);
    expect(boardColumns()).toEqual(['Beginning', 'End', 'Middle']);
    release();
  });

  it('drags a hidden beat, which stays hidden', async () => {
    hide({ hiddenBeatIds: [BEGINNING.id] });
    const user = userEvent.setup();
    const { variables, release } = holdMutation('ReorderPlotBeats');
    renderPlot();
    await screen.findByRole('table', { name: 'Plot board' });

    await pickUp(user, 'Beats', 'Beginning');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('[Space]');

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith(
        expect.objectContaining({ ids: [MIDDLE.id, BEGINNING.id, END.id] })
      )
    );
    expect(listNames('Beats')).toEqual(['Middle', 'Beginning', 'End']);
    expect(
      screen.getByRole('checkbox', { name: 'Show Beginning' })
    ).not.toBeChecked();
    expect(boardColumns()).toEqual(['Middle', 'End']);
    release();
  });

  it('keeps a drop inside its own section', async () => {
    const user = userEvent.setup();
    const { variables } = holdMutation('ReorderPlotlines');
    renderPlot();

    await pickUp(user, 'Plotlines', 'Ada');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('[Space]');

    expect(
      await screen.findByText(
        "Plotline 'Ada' was dropped back at position 2 of 2."
      )
    ).toBeInTheDocument();
    expect(variables).not.toHaveBeenCalled();
    expect(listNames('Plotlines')).toEqual(['Main plot', 'Ada']);
  });

  it('fades the dragged row and marks where it will land', async () => {
    const user = userEvent.setup();
    holdMutation('ReorderPlotBeats');
    renderPlot();

    await pickUp(user, 'Beats', 'End');
    await user.keyboard('{ArrowUp}');

    await waitFor(() =>
      expect(rowOf('Middle')).toHaveAttribute('data-drop', 'before')
    );
    expect(rowOf('End')).toHaveClass('opacity-40');
    expect(rowOf('Beginning')).not.toHaveAttribute('data-drop');
  });

  it('cancels with Escape and keeps the order', async () => {
    const user = userEvent.setup();
    const { variables } = holdMutation('ReorderPlotlines');
    renderPlot();

    await pickUp(user, 'Plotlines', 'Main plot');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Escape}');

    expect(
      await screen.findByText(
        "Moving plotline 'Main plot' was cancelled. It stays at position 1 of 2."
      )
    ).toBeInTheDocument();
    expect(variables).not.toHaveBeenCalled();
    expect(listNames('Plotlines')).toEqual(['Main plot', 'Ada']);
  });

  it('rolls a failed reorder back on both surfaces and says so', async () => {
    const user = userEvent.setup();
    failMutation('ReorderPlotlines');
    renderPlot();
    await screen.findByRole('table', { name: 'Plot board' });

    await pickUp(user, 'Plotlines', 'Main plot');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('[Space]');

    expect(await screen.findByText(PLOT_SAVE_ERROR)).toBeVisible();
    await waitFor(() =>
      expect(listNames('Plotlines')).toEqual(['Main plot', 'Ada'])
    );
    expect(boardRows()).toEqual(['Main plot', 'Ada']);
  });

  it('offers no drag handles when the plot is view-only', async () => {
    setViewportWidth(PLOT_EDIT_MIN_WIDTH - 1);
    renderPlot();

    const list = await screen.findByRole('list', { name: 'Plotlines' });
    expect(within(list).queryByRole('button', { name: /^Drag / })).toBeNull();
    expect(
      within(screen.getByRole('list', { name: 'Beats' })).queryByRole(
        'button',
        { name: /^Drag / }
      )
    ).toBeNull();
  });
});
