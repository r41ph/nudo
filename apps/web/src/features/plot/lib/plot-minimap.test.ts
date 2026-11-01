import { describe, expect, it } from 'vitest';
import {
  frameRect,
  keyTarget,
  markRect,
  minimapScale,
  positionLabel,
  scrollForFrameAt,
  scrollForView,
  scrollToCentreOn,
  viewFromScroll,
  visibleRange,
  type MinimapLayout,
  type MinimapMetrics,
} from '@web/features/plot/lib/plot-minimap';

const INNER_WIDTH = 232;
const MAX_HEIGHT = 120;
const MIN_FRAME = 12;

// 15 beats × 240px by 4 plotlines × 300px, in a 1000×500 container with a
// 180px label column, a 48px header, the 40px gutter and the "+ Plotline" row.
const LAYOUT: MinimapLayout = {
  regionWidth: 3600,
  regionHeight: 1200,
  viewWidth: 820,
  viewHeight: 452,
  originX: 40,
  originY: 0,
  maxScrollLeft: 2860,
  maxScrollTop: 820,
};

const at = (scrollLeft: number, scrollTop: number, layout = LAYOUT) =>
  viewFromScroll(layout, scrollLeft, scrollTop);

const extents = (count: number, size: number) =>
  Array.from({ length: count }, (_, i) => ({
    start: i * size,
    end: (i + 1) * size,
  }));
const COLUMNS = extents(15, 240);
const ROWS = extents(4, 300);

describe('minimapScale', () => {
  it('is limited by width on a wide board', () => {
    expect(minimapScale(at(0, 0), INNER_WIDTH, MAX_HEIGHT)).toBeCloseTo(
      232 / 3600
    );
  });

  it('is limited by height on a tall board', () => {
    const tall = { ...LAYOUT, regionWidth: 960, regionHeight: 2400 };
    expect(minimapScale(at(0, 0, tall), INNER_WIDTH, MAX_HEIGHT)).toBeCloseTo(
      120 / 2400
    );
  });
});

describe('viewFromScroll', () => {
  it('stays at the region start while the gutter scrolls by', () => {
    expect(at(0, 0)).toMatchObject({ viewX: 0, viewY: 0 });
    expect(at(20, 0)).toMatchObject({ viewX: 0 });
    expect(at(40, 0)).toMatchObject({ viewX: 0 });
  });

  it('offsets by the origin once the label column sticks', () => {
    expect(at(1040, 100)).toMatchObject({ viewX: 1000, viewY: 100 });
  });

  it('clamps past the region (right gutter, "+ Plotline" row)', () => {
    expect(at(2860, 820)).toMatchObject({ viewX: 2780, viewY: 748 });
  });

  it('caps the view at the region on an axis that does not overflow', () => {
    const narrow = { ...LAYOUT, regionWidth: 600, maxScrollLeft: 0 };
    expect(at(0, 0, narrow)).toMatchObject({ viewX: 0, viewWidth: 600 });
  });
});

describe('frameRect', () => {
  const s = 232 / 3600;

  it('sits at the top-left at the start', () => {
    const frame = frameRect(at(0, 0), s, MIN_FRAME);
    expect(frame.x).toBe(0);
    expect(frame.y).toBe(0);
    expect(frame.width).toBeCloseTo(820 * s);
    expect(frame.height).toBeCloseTo(452 * s);
  });

  it('scales the offset in the middle', () => {
    const frame = frameRect(at(1040, 74), s, MIN_FRAME);
    expect(frame.x).toBeCloseTo(1000 * s);
    expect(frame.y).toBeCloseTo(74 * s);
  });

  it('touches the bottom-right edge at the end', () => {
    const frame = frameRect(at(2860, 820), s, MIN_FRAME);
    expect(frame.x + frame.width).toBeCloseTo(3600 * s);
    expect(frame.y + frame.height).toBeCloseTo(1200 * s);
  });

  it('never gets smaller than the minimum and stays inside at the end', () => {
    const small = { ...LAYOUT, viewWidth: 100, viewHeight: 60 };
    const frame = frameRect(viewFromScroll(small, 1e6, 1e6), s, MIN_FRAME);
    expect(frame.width).toBe(MIN_FRAME);
    expect(frame.height).toBe(MIN_FRAME);
    expect(frame.x + frame.width).toBeCloseTo(3600 * s);
    expect(frame.y + frame.height).toBeCloseTo(1200 * s);
  });

  it('fills the axis that does not overflow', () => {
    const narrow = { ...LAYOUT, regionWidth: 600, maxScrollLeft: 0 };
    const scale = minimapScale(at(0, 0, narrow), INNER_WIDTH, MAX_HEIGHT);
    const frame = frameRect(at(0, 100, narrow), scale, MIN_FRAME);
    expect(frame.x).toBe(0);
    expect(frame.width).toBeCloseTo(600 * scale);
    expect(frame.y).toBeCloseTo(100 * scale);
  });
});

describe('scrollForView', () => {
  it('snaps the region edges to the real scroll ends', () => {
    expect(scrollForView(at(0, 0), 0, 0)).toEqual({ left: 0, top: 0 });
    expect(scrollForView(at(0, 0), 2780, 748)).toEqual({
      left: 2860,
      top: 820,
    });
  });

  it('adds the origin in between', () => {
    expect(scrollForView(at(0, 0), 1000, 100)).toEqual({
      left: 1040,
      top: 100,
    });
  });
});

describe('scrollForFrameAt', () => {
  const s = 232 / 3600;

  it('maps the frame position back to the scroll position', () => {
    expect(scrollForFrameAt(at(0, 0), s, 1000 * s, 74 * s, MIN_FRAME)).toEqual({
      left: 1040,
      top: 74,
    });
  });

  it('round-trips through frameRect', () => {
    const m = at(1540, 90);
    const frame = frameRect(m, s, MIN_FRAME);
    const scroll = scrollForFrameAt(m, s, frame.x, frame.y, MIN_FRAME);
    expect(scroll.left).toBeCloseTo(1540);
    expect(scroll.top).toBeCloseTo(90);
  });

  it('clamps a frame dragged past either end', () => {
    expect(scrollForFrameAt(at(0, 0), s, -50, -50, MIN_FRAME)).toEqual({
      left: 0,
      top: 0,
    });
    expect(scrollForFrameAt(at(0, 0), s, 1e4, 1e4, MIN_FRAME)).toEqual({
      left: 2860,
      top: 820,
    });
  });

  it('spreads an enlarged frame over the whole scroll range', () => {
    const small = { ...LAYOUT, viewWidth: 100, viewHeight: 60 };
    const m = viewFromScroll(small, 0, 0);
    const miniWidth = 3600 * s;
    const scroll = scrollForFrameAt(
      m,
      s,
      (miniWidth - MIN_FRAME) / 2,
      0,
      MIN_FRAME
    );
    expect(scroll.left).toBeCloseTo(40 + (3600 - 100) / 2);
  });
});

describe('scrollToCentreOn', () => {
  const s = 232 / 3600;

  it('centres the view on the pressed point', () => {
    const scroll = scrollToCentreOn(at(0, 0), s, 1800 * s, 600 * s, MIN_FRAME);
    expect(scroll.left).toBeCloseTo(40 + 1800 - 410);
    expect(scroll.top).toBeCloseTo(600 - 226);
  });

  it('clamps near the top-left corner', () => {
    expect(scrollToCentreOn(at(1040, 100), s, 1, 1, MIN_FRAME)).toEqual({
      left: 0,
      top: 0,
    });
  });

  it('clamps near the bottom-right corner', () => {
    expect(
      scrollToCentreOn(at(0, 0), s, 3600 * s - 1, 1200 * s - 1, MIN_FRAME)
    ).toEqual({ left: 2860, top: 820 });
  });
});

describe('markRect', () => {
  it('scales a card rectangle', () => {
    expect(
      markRect({ x: 240, y: 150, width: 200, height: 80 }, 0.1, 4, 2)
    ).toEqual({ x: 24, y: 15, width: 20, height: 8 });
  });

  it('keeps tiny marks visible', () => {
    expect(markRect({ x: 0, y: 0, width: 20, height: 10 }, 0.05, 4, 2)).toEqual(
      { x: 0, y: 0, width: 4, height: 2 }
    );
  });
});

describe('visibleRange', () => {
  it('includes items that are only partly on screen', () => {
    expect(visibleRange(COLUMNS, 300, 1120)).toEqual({ first: 2, last: 5 });
  });

  it('excludes an item that only touches the edge', () => {
    expect(visibleRange(COLUMNS, 240, 960)).toEqual({ first: 2, last: 4 });
  });

  it('is null when nothing is on screen', () => {
    expect(visibleRange([], 0, 100)).toBeNull();
  });
});

describe('positionLabel', () => {
  it('names both ranges with their visible totals', () => {
    expect(
      positionLabel({ first: 2, last: 4 }, 15, { first: 1, last: 3 }, 4)
    ).toBe('Beats 2–4 of 15 · Plotlines 1–3 of 4');
  });

  it('uses the singular for a single item', () => {
    expect(
      positionLabel({ first: 3, last: 3 }, 15, { first: 1, last: 1 }, 1)
    ).toBe('Beat 3 of 15 · Plotline 1 of 1');
  });
});

describe('keyTarget', () => {
  const press = (
    key: string,
    m: MinimapMetrics,
    mods: { shiftKey?: boolean; primary?: boolean } = {}
  ) =>
    keyTarget(
      { key, shiftKey: mods.shiftKey ?? false, primary: mods.primary ?? false },
      m,
      COLUMNS,
      ROWS
    );

  it('moves to the next and previous beat column', () => {
    expect(press('ArrowRight', at(0, 0))).toEqual({ left: 280, top: 0 });
    expect(press('ArrowRight', at(290, 0))).toEqual({ left: 520, top: 0 });
    expect(press('ArrowLeft', at(290, 0))).toEqual({ left: 280, top: 0 });
    expect(press('ArrowLeft', at(280, 0))).toEqual({ left: 0, top: 0 });
  });

  it('moves to the next and previous plotline row', () => {
    expect(press('ArrowDown', at(0, 0))).toEqual({ left: 0, top: 300 });
    expect(press('ArrowUp', at(0, 310))).toEqual({ left: 0, top: 300 });
    expect(press('ArrowUp', at(0, 300))).toEqual({ left: 0, top: 0 });
  });

  it('stops at the end when the last row cannot reach the top', () => {
    expect(press('ArrowDown', at(0, 610))).toEqual({ left: 0, top: 820 });
  });

  it('pages by one viewport, vertically or with Shift horizontally', () => {
    expect(press('PageDown', at(0, 0))).toEqual({ left: 0, top: 452 });
    expect(press('PageUp', at(0, 452))).toEqual({ left: 0, top: 0 });
    expect(press('PageDown', at(0, 0), { shiftKey: true })).toEqual({
      left: 860,
      top: 0,
    });
    expect(press('PageUp', at(1040, 0), { shiftKey: true })).toEqual({
      left: 220,
      top: 0,
    });
  });

  it('goes to the first or last beat, keeping the vertical position', () => {
    expect(press('Home', at(1040, 100))).toEqual({ left: 0, top: 100 });
    expect(press('End', at(1040, 100))).toEqual({ left: 2860, top: 100 });
  });

  it('goes to the corners with the primary modifier', () => {
    expect(press('Home', at(1040, 100), { primary: true })).toEqual({
      left: 0,
      top: 0,
    });
    expect(press('End', at(1040, 100), { primary: true })).toEqual({
      left: 2860,
      top: 820,
    });
  });

  it('ignores other keys', () => {
    expect(press('Enter', at(0, 0))).toBeNull();
  });
});
