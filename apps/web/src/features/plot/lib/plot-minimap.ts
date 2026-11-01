// Board pixels. The region is the grid minus the sticky beat header row and
// plotline label column: the part that actually scrolls under them.
export interface MinimapLayout {
  regionWidth: number;
  regionHeight: number;
  viewWidth: number;
  viewHeight: number;
  // scrollLeft/scrollTop at which the region's edge meets the stuck column/row.
  originX: number;
  originY: number;
  maxScrollLeft: number;
  maxScrollTop: number;
}

export interface MinimapMetrics extends MinimapLayout {
  viewX: number;
  viewY: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Extent {
  start: number;
  end: number;
}

export interface Range {
  first: number;
  last: number;
}

export interface ScrollTarget {
  left: number;
  top: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

const maxViewX = (m: MinimapLayout) => Math.max(0, m.regionWidth - m.viewWidth);
const maxViewY = (m: MinimapLayout) =>
  Math.max(0, m.regionHeight - m.viewHeight);

export function viewFromScroll(
  layout: MinimapLayout,
  scrollLeft: number,
  scrollTop: number
): MinimapMetrics {
  const m = {
    ...layout,
    viewWidth: Math.min(layout.viewWidth, layout.regionWidth),
    viewHeight: Math.min(layout.viewHeight, layout.regionHeight),
  };
  return {
    ...m,
    viewX: clamp(scrollLeft - m.originX, 0, maxViewX(m)),
    viewY: clamp(scrollTop - m.originY, 0, maxViewY(m)),
  };
}

export function minimapScale(
  m: MinimapLayout,
  innerWidth: number,
  maxHeight: number
) {
  return Math.min(innerWidth / m.regionWidth, maxHeight / m.regionHeight);
}

// An enlarged (minimum-size) frame travels less than the view does, so the
// mapping is proportional over each one's free range, not a plain scale.
function frameAxis(
  view: number,
  viewSize: number,
  region: number,
  scale: number,
  minSize: number
) {
  const mini = region * scale;
  const size = Math.min(Math.max(viewSize * scale, minSize), mini);
  const viewRange = region - viewSize;
  const frameRange = mini - size;
  const offset = viewRange > 0 ? (view / viewRange) * frameRange : 0;
  return { offset: clamp(offset, 0, frameRange), size, viewRange, frameRange };
}

export function frameRect(
  m: MinimapMetrics,
  scale: number,
  minSize: number
): Rect {
  const x = frameAxis(m.viewX, m.viewWidth, m.regionWidth, scale, minSize);
  const y = frameAxis(m.viewY, m.viewHeight, m.regionHeight, scale, minSize);
  return { x: x.offset, y: y.offset, width: x.size, height: y.size };
}

// At the region's edges the board scrolls all the way, so the gutter before
// the label column sticks and the "+ Plotline" row below the grid show too.
export function scrollForView(
  m: MinimapMetrics,
  viewX: number,
  viewY: number
): ScrollTarget {
  const toScroll = (
    view: number,
    max: number,
    origin: number,
    limit: number
  ) => (view <= 0 ? 0 : view >= max ? limit : clamp(view + origin, 0, limit));
  return {
    left: toScroll(viewX, maxViewX(m), m.originX, m.maxScrollLeft),
    top: toScroll(viewY, maxViewY(m), m.originY, m.maxScrollTop),
  };
}

export function scrollForFrameAt(
  m: MinimapMetrics,
  scale: number,
  frameX: number,
  frameY: number,
  minSize: number
): ScrollTarget {
  const toView = (frame: number, axis: ReturnType<typeof frameAxis>) =>
    axis.frameRange > 0
      ? (clamp(frame, 0, axis.frameRange) / axis.frameRange) * axis.viewRange
      : 0;
  const x = frameAxis(m.viewX, m.viewWidth, m.regionWidth, scale, minSize);
  const y = frameAxis(m.viewY, m.viewHeight, m.regionHeight, scale, minSize);
  return scrollForView(m, toView(frameX, x), toView(frameY, y));
}

export function scrollToCentreOn(
  m: MinimapMetrics,
  scale: number,
  pointX: number,
  pointY: number,
  minSize: number
): ScrollTarget {
  const frame = frameRect(m, scale, minSize);
  return scrollForFrameAt(
    m,
    scale,
    pointX - frame.width / 2,
    pointY - frame.height / 2,
    minSize
  );
}

export function markRect(
  rect: Rect,
  scale: number,
  minWidth: number,
  minHeight: number
): Rect {
  return {
    x: rect.x * scale,
    y: rect.y * scale,
    width: Math.max(rect.width * scale, minWidth),
    height: Math.max(rect.height * scale, minHeight),
  };
}

// 1-based, counting items at least partly between start and end.
export function visibleRange(
  extents: readonly Extent[],
  start: number,
  end: number
): Range | null {
  let first = 0;
  let last = 0;
  extents.forEach((extent, index) => {
    if (extent.start < end && extent.end > start) {
      if (!first) first = index + 1;
      last = index + 1;
    }
  });
  return first ? { first, last } : null;
}

function rangeLabel(noun: string, range: Range, total: number) {
  return range.first === range.last
    ? `${noun} ${range.first} of ${total}`
    : `${noun}s ${range.first}–${range.last} of ${total}`;
}

export function positionLabel(
  beats: Range,
  beatTotal: number,
  plotlines: Range,
  plotlineTotal: number
) {
  return `${rangeLabel('Beat', beats, beatTotal)} · ${rangeLabel('Plotline', plotlines, plotlineTotal)}`;
}

export interface MinimapKey {
  key: string;
  shiftKey: boolean;
  // ⌘ on macOS, Ctrl elsewhere; the caller knows the platform.
  primary: boolean;
}

// A column reached by the previous key press must count as "here" despite
// sub-pixel layout, or the next press would land on it again.
const EDGE_SLACK = 1;

const nextStart = (extents: readonly Extent[], from: number) =>
  extents.find((e) => e.start > from + EDGE_SLACK)?.start;

const previousStart = (extents: readonly Extent[], from: number) =>
  extents.filter((e) => e.start < from - EDGE_SLACK).at(-1)?.start ?? 0;

export function keyTarget(
  { key, shiftKey, primary }: MinimapKey,
  m: MinimapMetrics,
  columns: readonly Extent[],
  rows: readonly Extent[]
): ScrollTarget | null {
  const go = (viewX: number, viewY: number) =>
    scrollForView(
      m,
      clamp(viewX, 0, maxViewX(m)),
      clamp(viewY, 0, maxViewY(m))
    );
  switch (key) {
    case 'ArrowRight':
      return go(nextStart(columns, m.viewX) ?? maxViewX(m), m.viewY);
    case 'ArrowLeft':
      return go(previousStart(columns, m.viewX), m.viewY);
    case 'ArrowDown':
      return go(m.viewX, nextStart(rows, m.viewY) ?? maxViewY(m));
    case 'ArrowUp':
      return go(m.viewX, previousStart(rows, m.viewY));
    case 'PageDown':
      return shiftKey
        ? go(m.viewX + m.viewWidth, m.viewY)
        : go(m.viewX, m.viewY + m.viewHeight);
    case 'PageUp':
      return shiftKey
        ? go(m.viewX - m.viewWidth, m.viewY)
        : go(m.viewX, m.viewY - m.viewHeight);
    case 'Home':
      return go(0, primary ? 0 : m.viewY);
    case 'End':
      return go(maxViewX(m), primary ? maxViewY(m) : m.viewY);
    default:
      return null;
  }
}
