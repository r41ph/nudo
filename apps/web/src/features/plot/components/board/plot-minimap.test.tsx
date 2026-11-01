import { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  holdMutation,
  holdPlotRefetch,
  renderBoard,
} from '@web/features/plot/test/plot-board-harness';
import {
  stubBoardLayout,
  type Viewport,
} from '@web/features/plot/test/plot-board-layout';
import {
  PLOT_EDIT_MIN_WIDTH,
  PLOT_VIEW_STORAGE_PREFIX,
} from '@web/features/plot/constants/plot.constants';
import { usePlotView } from '@web/features/plot/state/plot-view.store';
import { setViewportWidth } from '@web/test/media';
import {
  MOCK_PLOTLINES,
  MOCK_PLOT_BEATS,
  MOCK_PROJECT,
} from '@web/test/mocks/fixtures';

const [MAIN, ADA] = MOCK_PLOTLINES;
const [, MIDDLE, END] = MOCK_PLOT_BEATS;

// The fixture board is 980×440 including the gutters, "+ Plotline" and the
// bottom padding; its region (cells only) is 720×320.
const FITS = { width: 1200, height: 800 };
const WIDE = { width: 600, height: 800 };
const TALL = { width: 1200, height: 300 };

let layout: ReturnType<typeof stubBoardLayout>;
afterEach(() => layout.restore());

type PlotViewApi = ReturnType<typeof usePlotView>;
const viewRef: { current: PlotViewApi | null } = { current: null };
function ViewHandle() {
  const plotView = usePlotView(MOCK_PROJECT.id);
  useEffect(() => {
    viewRef.current = plotView;
  });
  return null;
}
// The sidebar's checkboxes call these.
const view = {
  toggle: (...args: Parameters<PlotViewApi['toggle']>) =>
    viewRef.current!.toggle(...args),
  showAll: () => viewRef.current!.showAll(),
};

async function renderMinimapBoard(viewport: Viewport) {
  layout = stubBoardLayout(viewport);
  renderBoard(<ViewHandle />);
  await screen.findByRole('table', { name: 'Plot board' });
}

const minimap = () => screen.queryByTestId('plot-minimap');
const marks = () => screen.queryAllByTestId('plot-minimap-mark');
const miniature = () => screen.getByTestId('plot-minimap-miniature');

describe('PlotMinimap — when it shows', () => {
  it('is not rendered when the board fits', async () => {
    await renderMinimapBoard(FITS);

    expect(minimap()).toBeNull();
  });

  it('is rendered when the board overflows horizontally only', async () => {
    await renderMinimapBoard(WIDE);

    expect(await screen.findByTestId('plot-minimap')).toBeInTheDocument();
  });

  it('is rendered when the board overflows vertically only', async () => {
    await renderMinimapBoard(TALL);

    expect(await screen.findByTestId('plot-minimap')).toBeInTheDocument();
  });

  it('appears once a resize makes the board overflow', async () => {
    await renderMinimapBoard(FITS);
    expect(minimap()).toBeNull();

    layout.resize(WIDE);

    expect(await screen.findByTestId('plot-minimap')).toBeInTheDocument();
  });

  it('keeps clear of the native scrollbars', async () => {
    await renderMinimapBoard({ ...WIDE, scrollbar: 15 });

    expect(await screen.findByTestId('plot-minimap')).toHaveStyle({
      marginRight: '15px',
      marginBottom: '15px',
    });
  });

  it('works in view-only mode', async () => {
    setViewportWidth(PLOT_EDIT_MIN_WIDTH - 1);
    await renderMinimapBoard(WIDE);

    expect(await screen.findByTestId('plot-minimap')).toBeInTheDocument();
  });

  it('is not rendered when everything is hidden', async () => {
    await renderMinimapBoard(WIDE);
    await screen.findByTestId('plot-minimap');

    act(() => {
      view.toggle('plotline', MAIN.id);
      view.toggle('plotline', ADA.id);
    });

    expect(await screen.findByText('Everything is hidden.')).toBeVisible();
    expect(minimap()).toBeNull();
  });
});

describe('PlotMinimap — miniature', () => {
  it('is hidden from assistive technology', async () => {
    await renderMinimapBoard(WIDE);
    await screen.findByTestId('plot-minimap');

    expect(miniature()).toHaveAttribute('aria-hidden', 'true');
  });

  // Width-limited: 230 / 720 is smaller than 120 / 320.
  it('scales the region into the box', async () => {
    await renderMinimapBoard(WIDE);
    await screen.findByTestId('plot-minimap');

    expect(parseFloat(miniature().style.width)).toBeCloseTo(230);
    expect(parseFloat(miniature().style.height)).toBeCloseTo(102.2, 1);
  });

  it('draws one mark per visible card in its plotline colour', async () => {
    await renderMinimapBoard(WIDE);
    await screen.findByTestId('plot-minimap');

    expect(marks()).toHaveLength(4);
    expect(
      marks().filter((m) => m.style.backgroundColor === 'var(--plot-red)')
    ).toHaveLength(3);
    expect(
      marks().filter((m) => m.style.backgroundColor === 'var(--plot-green)')
    ).toHaveLength(1);
  });

  it('adds a mark for a new card', async () => {
    const user = userEvent.setup();
    const { release } = holdMutation('CreatePlotCard');
    await renderMinimapBoard(WIDE);
    await screen.findByTestId('plot-minimap');
    holdPlotRefetch();

    const row = screen
      .getByRole('rowheader', { name: /Main plot/ })
      .closest('[role="row"]') as HTMLElement;
    await user.click(
      within(within(row).getAllByRole('cell')[2]).getByRole('button', {
        name: 'Add card',
      })
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Title' }),
      'The lamp goes dark'
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    release();

    await waitFor(() => expect(marks()).toHaveLength(5));
  });
});

describe('PlotMinimap — sidebar filters', () => {
  it('drops the marks of a hidden plotline and re-scales', async () => {
    await renderMinimapBoard(WIDE);
    await screen.findByTestId('plot-minimap');

    act(() => view.toggle('plotline', ADA.id));

    await waitFor(() => expect(marks()).toHaveLength(3));
    // Region 720×160 now: still width-limited, half as tall.
    expect(parseFloat(miniature().style.width)).toBeCloseTo(230);
    expect(parseFloat(miniature().style.height)).toBeCloseTo(51.1, 1);
  });

  it('drops the marks of a hidden beat', async () => {
    await renderMinimapBoard(WIDE);
    await screen.findByTestId('plot-minimap');

    act(() => view.toggle('beat', MIDDLE.id));

    await waitFor(() => expect(marks()).toHaveLength(3));
  });

  it('goes away when hiding beats makes the board fit, and comes back', async () => {
    await renderMinimapBoard({ width: 700, height: 800 });
    await screen.findByTestId('plot-minimap');

    act(() => {
      view.toggle('beat', MIDDLE.id);
      view.toggle('beat', END.id);
    });
    await waitFor(() => expect(minimap()).toBeNull());

    act(() => view.showAll());
    expect(await screen.findByTestId('plot-minimap')).toBeInTheDocument();
    expect(marks()).toHaveLength(4);
  });

  // Height-limited: the region is 480×320 with End hidden.
  it('measures a board that loads with a stored filter', async () => {
    localStorage.setItem(
      PLOT_VIEW_STORAGE_PREFIX + MOCK_PROJECT.id,
      JSON.stringify({ hiddenPlotlineIds: [], hiddenBeatIds: [END.id] })
    );
    await renderMinimapBoard({ width: 700, height: 800 });
    await screen.findByTestId('plot-minimap');

    expect(marks()).toHaveLength(3);
    expect(miniature().style.width).toBe('180px');
    expect(miniature().style.height).toBe('120px');
  });
});
