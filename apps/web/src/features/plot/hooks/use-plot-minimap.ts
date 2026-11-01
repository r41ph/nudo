import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
} from 'react';
import type {
  Extent,
  MinimapLayout,
  Rect,
} from '@web/features/plot/lib/plot-minimap';
import type { Plot } from '@web/features/plot/plot.types';

export interface MinimapMark {
  cardId: string;
  // Region coordinates, in board pixels.
  rect: Rect;
}

export interface MinimapSnapshot {
  layout: MinimapLayout;
  marks: MinimapMark[];
  columns: Extent[];
  rows: Extent[];
  // Native scrollbar thickness: the vertical one's width, the horizontal one's
  // height.
  scrollbar: { right: number; bottom: number };
}

// Card text is included because it sets a card's height, which can change
// without the grid itself resizing.
export function minimapSignature(plot: Plot, editable: boolean) {
  return JSON.stringify([
    plot.beats.map((b) => b.id),
    plot.plotlines.map((p) => [p.id, p.color]),
    plot.cards.map((c) => [
      c.id,
      c.plotlineId,
      c.beatId,
      c.position,
      c.title,
      c.description,
    ]),
    // "+ Plotline" only shows when editable, and it adds to the scroll height.
    editable,
  ]);
}

const rects = (root: Element, selector: string) =>
  [...root.querySelectorAll(selector)].map((el) => el.getBoundingClientRect());

// Sticky header cells move with scrollTop and sticky labels with scrollLeft,
// so each is only read along the axis it doesn't stick on.
function measure(
  container: HTMLElement,
  grid: HTMLElement
): MinimapSnapshot | null {
  const overflows =
    container.scrollWidth > container.clientWidth ||
    container.scrollHeight > container.clientHeight;
  if (!overflows) return null;

  const box = container.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  const headers = rects(grid, '[role="columnheader"]');
  const labels = rects(grid, '[role="rowheader"]');
  const labelWidth =
    labels[0]?.width ?? (headers[0] ? headers[0].left - gridRect.left : 0);
  const headerHeight = labels[0]
    ? labels[0].top - gridRect.top
    : (headers[0]?.height ?? 0);
  const regionLeft = gridRect.left + labelWidth;
  const regionTop = gridRect.top + headerHeight;
  const regionWidth = gridRect.width - labelWidth;
  const regionHeight = gridRect.height - headerHeight;
  if (regionWidth <= 0 || regionHeight <= 0) return null;

  return {
    layout: {
      regionWidth,
      regionHeight,
      viewWidth: container.clientWidth - labelWidth,
      viewHeight: container.clientHeight - headerHeight,
      originX:
        gridRect.left -
        (box.left + container.clientLeft) +
        container.scrollLeft,
      originY:
        gridRect.top - (box.top + container.clientTop) + container.scrollTop,
      maxScrollLeft: container.scrollWidth - container.clientWidth,
      maxScrollTop: container.scrollHeight - container.clientHeight,
    },
    marks: [...grid.querySelectorAll<HTMLElement>('[data-card-id]')].map(
      (el) => {
        const r = el.getBoundingClientRect();
        return {
          cardId: el.dataset.cardId!,
          rect: {
            x: r.left - regionLeft,
            y: r.top - regionTop,
            width: r.width,
            height: r.height,
          },
        };
      }
    ),
    columns: headers.map((h) => ({
      start: h.left - regionLeft,
      end: h.right - regionLeft,
    })),
    rows: labels.map((l) => ({
      start: l.top - regionTop,
      end: l.bottom - regionTop,
    })),
    scrollbar: {
      right: container.offsetWidth - container.clientWidth,
      bottom: container.offsetHeight - container.clientHeight,
    },
  };
}

const sameSnapshot = (a: MinimapSnapshot | null, b: MinimapSnapshot | null) =>
  JSON.stringify(a) === JSON.stringify(b);

// Measured on resize and when the visible plot changes, never on scroll: the
// snapshot is in board pixels, so scrolling doesn't change it. Returns null
// while nothing overflows.
export function usePlotMinimap(
  containerRef: RefObject<HTMLElement | null>,
  gridRef: RefObject<HTMLElement | null>,
  signature: string
) {
  const [snapshot, setSnapshot] = useState<MinimapSnapshot | null>(null);

  const update = useCallback(() => {
    const container = containerRef.current;
    const grid = gridRef.current;
    if (!container || !grid) return;
    const next = measure(container, grid);
    setSnapshot((prev) => (sameSnapshot(prev, next) ? prev : next));
  }, [containerRef, gridRef]);

  useLayoutEffect(update, [update, signature]);

  useEffect(() => {
    const container = containerRef.current;
    const grid = gridRef.current;
    if (!container || !grid) return;
    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [containerRef, gridRef, update]);

  return snapshot;
}
