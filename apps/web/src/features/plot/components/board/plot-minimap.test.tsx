import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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

const frame = () => screen.getByTestId('plot-minimap-frame');
const scrollContainer = () =>
  screen.getByRole('table', { name: 'Plot board' }).parentElement!;

function framePosition() {
  const match = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(
    frame().style.transform
  );
  if (!match) throw new Error(`No translate in "${frame().style.transform}"`);
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
}

function scrollBoard(left: number, top: number) {
  const container = scrollContainer();
  layout.scrollTo(container, left, top);
  fireEvent.scroll(container);
}

// Both axes overflow at 600×300: the view is 420×252 of the 720×320 region,
// at the width-limited scale 230/720.
const BOTH = { width: 600, height: 300 };

describe('PlotMinimap — frame', () => {
  it('covers the visible part of the region at the start', async () => {
    await renderMinimapBoard(BOTH);
    await screen.findByTestId('plot-minimap');

    expect(framePosition()).toEqual({ x: 0, y: 0 });
    expect(parseFloat(frame().style.width)).toBeCloseTo(134.17, 1);
    expect(parseFloat(frame().style.height)).toBeCloseTo(80.5, 1);
  });

  it('follows the board when it scrolls', async () => {
    await renderMinimapBoard(BOTH);
    await screen.findByTestId('plot-minimap');

    // scrollLeft 190 is viewX 150 of 300, past the 40px gutter.
    scrollBoard(190, 34);

    await waitFor(() => expect(framePosition().x).toBeCloseTo(47.92, 1));
    expect(framePosition().y).toBeCloseTo(10.86, 1);
  });

  it('stays clamped at the edge when the board scrolls past the region', async () => {
    await renderMinimapBoard(BOTH);
    await screen.findByTestId('plot-minimap');

    // The bottom of the scroll range shows "+ Plotline" and the padding.
    scrollBoard(380, 140);

    await waitFor(() => expect(framePosition().x).toBeCloseTo(95.83, 1));
    expect(framePosition().y).toBeCloseTo(21.72, 1);
  });

  it('does not re-render the board or the marks on scroll', async () => {
    let renders = 0;
    layout = stubBoardLayout(BOTH);
    renderBoard(<ViewHandle />, () => {
      renders += 1;
    });
    await screen.findByTestId('plot-minimap');
    const before = renders;

    scrollBoard(190, 34);
    await waitFor(() => expect(framePosition().x).toBeCloseTo(47.92, 1));

    expect(renders).toBe(before);
  });

  it('re-syncs after a filter shrinks the board, without a scroll event', async () => {
    await renderMinimapBoard({ width: 600, height: 800 });
    await screen.findByTestId('plot-minimap');
    scrollBoard(380, 0);
    await waitFor(() => expect(framePosition().x).toBeCloseTo(95.83, 1));

    // The region is 480 wide now and the browser clamps scrollLeft to 140:
    // height-limited at 0.375, the frame is 157.5 of 180 and at the far edge.
    act(() => view.toggle('beat', END.id));

    await waitFor(() =>
      expect(parseFloat(frame().style.width)).toBeCloseTo(157.5, 1)
    );
    expect(framePosition().x).toBeCloseTo(22.5, 1);
  });
});

// The miniature sits at the viewport origin in the layout stub, so client
// coordinates are miniature coordinates. At BOTH the frame is 134.17×80.5 and
// travels 95.83×21.72 for a view travel of 300×68.
describe('PlotMinimap — pointer and wheel', () => {
  beforeEach(() => {
    Object.assign(Element.prototype, {
      setPointerCapture: () => {},
      releasePointerCapture: () => {},
      hasPointerCapture: () => false,
    });
  });

  const scroll = () => ({
    left: scrollContainer().scrollLeft,
    top: scrollContainer().scrollTop,
  });

  it('scrolls both axes while the frame is dragged, keeping the grab point', async () => {
    await renderMinimapBoard(BOTH);
    await screen.findByTestId('plot-minimap');

    fireEvent.pointerDown(frame(), { pointerId: 1, clientX: 50, clientY: 40 });
    expect(scroll()).toEqual({ left: 0, top: 0 });

    // Half the frame's travel on each axis: viewX 150 and viewY 34.
    fireEvent.pointerMove(frame(), {
      pointerId: 1,
      clientX: 50 + 47.917,
      clientY: 40 + 10.861,
    });
    expect(scroll().left).toBeCloseTo(190, 0);
    expect(scroll().top).toBeCloseTo(34, 0);
    expect(layout.scrollToCalls).toHaveBeenLastCalledWith(
      expect.objectContaining({ behavior: 'auto' })
    );

    fireEvent.pointerUp(frame(), { pointerId: 1 });
    fireEvent.pointerMove(frame(), { pointerId: 1, clientX: 0, clientY: 0 });
    expect(scroll().left).toBeCloseTo(190, 0);
  });

  it('centres the view where the miniature is pressed, then drags from there', async () => {
    await renderMinimapBoard(BOTH);
    await screen.findByTestId('plot-minimap');

    fireEvent.pointerDown(miniature(), {
      pointerId: 1,
      clientX: 150,
      clientY: 60,
    });
    expect(layout.scrollToCalls).toHaveBeenLastCalledWith(
      expect.objectContaining({ behavior: 'smooth' })
    );
    expect(scroll().left).toBeCloseTo(299.57, 1);
    expect(scroll().top).toBeCloseTo(61.83, 1);

    fireEvent.pointerMove(miniature(), {
      pointerId: 1,
      clientX: 160,
      clientY: 60,
    });
    expect(scroll().left).toBeCloseTo(330.87, 1);
    expect(scroll().top).toBeCloseTo(61.83, 1);
  });

  it('jumps instantly with reduced motion', async () => {
    const matchMedia = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
      query.includes('prefers-reduced-motion')
        ? ({ ...matchMedia(query), matches: true } as MediaQueryList)
        : matchMedia(query)
    );
    await renderMinimapBoard(BOTH);
    await screen.findByTestId('plot-minimap');

    fireEvent.pointerDown(miniature(), {
      pointerId: 1,
      clientX: 150,
      clientY: 60,
    });

    expect(layout.scrollToCalls).toHaveBeenLastCalledWith(
      expect.objectContaining({ behavior: 'auto' })
    );
    vi.mocked(window.matchMedia).mockRestore();
  });

  it('scrolls the board with the wheel, never the page', async () => {
    await renderMinimapBoard(BOTH);
    const box = await screen.findByTestId('plot-minimap');

    const notPrevented = fireEvent.wheel(box, { deltaX: 30, deltaY: 20 });

    expect(notPrevented).toBe(false);
    expect(scroll()).toEqual({ left: 30, top: 20 });
  });

  it('turns Shift+wheel into horizontal scrolling', async () => {
    await renderMinimapBoard(BOTH);
    const box = await screen.findByTestId('plot-minimap');

    fireEvent.wheel(box, { deltaY: 50, shiftKey: true });

    expect(scroll()).toEqual({ left: 50, top: 0 });
  });

  it('steps aside while a card is dragged', async () => {
    const user = userEvent.setup();
    await renderMinimapBoard(BOTH);
    const box = await screen.findByTestId('plot-minimap');
    const card = screen
      .getAllByRole('button')
      .find((b) => b.dataset.cardId !== undefined)!;

    card.focus();
    await user.keyboard('[Space]');
    expect(box).toHaveClass('pointer-events-none', 'opacity-40');

    await user.keyboard('{Escape}');
    expect(box).not.toHaveClass('pointer-events-none');
  });
});

// At 400×200 the view is 220×152 of the 720×320 region, so every column and
// row start is reachable without clamping. Scroll range: 580×240, gutter 40.
const KEYS = { width: 400, height: 200 };

describe('PlotMinimap — keyboard and position', () => {
  afterEach(() => vi.useRealTimers());

  const control = () => screen.getByRole('group', { name: 'Board position' });
  const status = () => within(minimap()!).getByRole('status');
  const scroll = () => ({
    left: scrollContainer().scrollLeft,
    top: scrollContainer().scrollTop,
  });

  async function renderAt(left = 0, top = 0) {
    await renderMinimapBoard(KEYS);
    await screen.findByTestId('plot-minimap');
    layout.scrollTo(scrollContainer(), left, top);
  }

  it('is a focusable control for the board', async () => {
    await renderAt();

    expect(control()).toHaveAttribute('tabindex', '0');
    expect(control()).toHaveAttribute('aria-roledescription', 'minimap');
    expect(control()).toHaveAttribute('aria-controls', scrollContainer().id);
    expect(scrollContainer().id).not.toBe('');
  });

  it.each([
    ['{ArrowRight}', [0, 0], { left: 280, top: 0 }],
    ['{ArrowLeft}', [280, 0], { left: 0, top: 0 }],
    ['{ArrowDown}', [0, 0], { left: 0, top: 160 }],
    ['{ArrowUp}', [0, 160], { left: 0, top: 0 }],
    ['{PageDown}', [0, 0], { left: 0, top: 152 }],
    ['{PageUp}', [0, 152], { left: 0, top: 0 }],
    ['{Shift>}{PageDown}{/Shift}', [0, 0], { left: 260, top: 0 }],
    ['{Shift>}{PageUp}{/Shift}', [260, 0], { left: 0, top: 0 }],
    ['{End}', [0, 152], { left: 580, top: 152 }],
    ['{Home}', [580, 152], { left: 0, top: 152 }],
    ['{Control>}{End}{/Control}', [0, 0], { left: 580, top: 240 }],
    ['{Control>}{Home}{/Control}', [580, 240], { left: 0, top: 0 }],
  ])('%s scrolls the board', async (keys, [left, top], expected) => {
    const user = userEvent.setup();
    await renderAt(left, top);

    control().focus();
    await user.keyboard(keys);

    expect(scroll()).toEqual(expected);
    expect(layout.scrollToCalls).toHaveBeenLastCalledWith(
      expect.objectContaining({ behavior: 'smooth' })
    );
  });

  it('uses ⌘ instead of Ctrl on macOS', async () => {
    const platform = vi
      .spyOn(navigator, 'platform', 'get')
      .mockReturnValue('MacIntel');
    const user = userEvent.setup();
    await renderAt();

    control().focus();
    await user.keyboard('{Control>}{End}{/Control}');
    expect(scroll()).toEqual({ left: 580, top: 0 });

    await user.keyboard('{Meta>}{Home}{/Meta}');
    expect(scroll()).toEqual({ left: 0, top: 0 });
    platform.mockRestore();
  });

  it('keeps the page from scrolling on its keys only', async () => {
    await renderAt();

    expect(fireEvent.keyDown(control(), { key: 'PageDown' })).toBe(false);
    expect(fireEvent.keyDown(control(), { key: 'a' })).toBe(true);
  });

  it('shows the position in a tooltip on focus, kept in step with scrolling', async () => {
    await renderAt();

    act(() => control().focus());

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Beat 1 of 3 · Plotline 1 of 2'
    );
    scrollBoard(280, 0);
    await waitFor(() =>
      expect(screen.getByRole('tooltip')).toHaveTextContent(
        'Beat 2 of 3 · Plotline 1 of 2'
      )
    );
  });

  it('shows the position in a tooltip on hover', async () => {
    const user = userEvent.setup();
    await renderAt(0, 100);

    await user.hover(control());

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Beat 1 of 3 · Plotlines 1–2 of 2'
    );
  });

  it('announces the position 300ms after the last key move', async () => {
    await renderAt();
    control().focus();
    vi.useFakeTimers();

    fireEvent.keyDown(control(), { key: 'ArrowRight' });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.keyDown(control(), { key: 'ArrowRight' });
    act(() => vi.advanceTimersByTime(299));
    expect(status()).toHaveTextContent('');

    act(() => vi.advanceTimersByTime(1));
    expect(status()).toHaveTextContent('Beat 3 of 3 · Plotline 1 of 2');
  });

  it('does not announce ordinary scrolling', async () => {
    await renderAt();
    vi.useFakeTimers();

    scrollBoard(280, 160);
    act(() => vi.advanceTimersByTime(1000));

    expect(status()).toHaveTextContent('');
  });

  it('counts and steps through visible beats and plotlines only', async () => {
    await renderAt();
    act(() => {
      view.toggle('beat', MIDDLE.id);
      view.toggle('plotline', ADA.id);
    });
    control().focus();
    vi.useFakeTimers();

    fireEvent.keyDown(control(), { key: 'ArrowRight' });
    act(() => vi.advanceTimersByTime(300));

    // The end beat's column now starts at 240, where the middle one was.
    expect(scroll().left).toBe(280);
    expect(status()).toHaveTextContent('Beat 2 of 2 · Plotline 1 of 1');
  });
});
