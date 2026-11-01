import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import {
  PLOT_MINIMAP_MIN_FRAME,
  PLOT_MINIMAP_WHEEL_LINE_HEIGHT,
} from '@web/features/plot/constants/plot.constants';
import {
  frameRect,
  scrollForFrameAt,
  scrollToCentreOn,
  viewFromScroll,
  type Extent,
  type MinimapLayout,
  type Rect,
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

// Scroll position never goes through React state: rendering the board on every
// scroll frame would be far too slow, so the frame is written through its ref.
export function usePlotMinimapFrame(
  containerRef: RefObject<HTMLElement | null>,
  frameRef: RefObject<HTMLElement | null>,
  layout: MinimapLayout | null,
  scale: number
) {
  const sync = useCallback(() => {
    const container = containerRef.current;
    const frame = frameRef.current;
    if (!container || !frame || !layout) return;
    const m = viewFromScroll(layout, container.scrollLeft, container.scrollTop);
    const rect = frameRect(m, scale, PLOT_MINIMAP_MIN_FRAME);
    frame.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
    frame.style.width = `${rect.width}px`;
    frame.style.height = `${rect.height}px`;
  }, [containerRef, frameRef, layout, scale]);

  // A re-measure can follow a clamped scroll (filters shrinking the board)
  // that fires no scroll event, so every new layout re-syncs on its own.
  useLayoutEffect(sync, [sync]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let frameId = 0;
    const onScroll = () => {
      if (frameId) return;
      frameId = requestAnimationFrame(() => {
        frameId = 0;
        sync();
      });
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frameId);
    };
  }, [containerRef, sync]);
}

const jumpBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';

interface Grab {
  pointerId: number;
  // Where the frame was taken hold of, from its top-left corner.
  dx: number;
  dy: number;
}

// Pointer handlers for the element holding the miniature and the frame.
// Pointer positions are read relative to that element.
export function usePlotMinimapPointer(
  containerRef: RefObject<HTMLElement | null>,
  frameRef: RefObject<HTMLElement | null>,
  layout: MinimapLayout | null,
  scale: number
) {
  const grabRef = useRef<Grab | null>(null);

  const read = (event: ReactPointerEvent<HTMLElement>) => {
    const container = containerRef.current;
    if (!container || !layout) return null;
    const box = event.currentTarget.getBoundingClientRect();
    return {
      container,
      m: viewFromScroll(layout, container.scrollLeft, container.scrollTop),
      x: event.clientX - box.left,
      y: event.clientY - box.top,
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const at = read(event);
    if (!at) return;
    const { container, m, x, y } = at;
    const frame = frameRect(m, scale, PLOT_MINIMAP_MIN_FRAME);
    const onFrame =
      x >= frame.x &&
      x <= frame.x + frame.width &&
      y >= frame.y &&
      y <= frame.y + frame.height;
    if (!onFrame) {
      container.scrollTo({
        ...scrollToCentreOn(m, scale, x, y, PLOT_MINIMAP_MIN_FRAME),
        behavior: jumpBehavior(),
      });
    }
    // After a jump the frame is centred on the pointer, so the drag that
    // follows holds it by its centre.
    grabRef.current = {
      pointerId: event.pointerId,
      dx: onFrame ? x - frame.x : frame.width / 2,
      dy: onFrame ? y - frame.y : frame.height / 2,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    frameRef.current?.setAttribute('data-dragging', '');
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const grab = grabRef.current;
    if (grab?.pointerId !== event.pointerId) return;
    const at = read(event);
    if (!at) return;
    // Always direct: a smoothed drag would trail behind the pointer.
    at.container.scrollTo({
      ...scrollForFrameAt(
        at.m,
        scale,
        at.x - grab.dx,
        at.y - grab.dy,
        PLOT_MINIMAP_MIN_FRAME
      ),
      behavior: 'auto',
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (grabRef.current?.pointerId !== event.pointerId) return;
    grabRef.current = null;
    frameRef.current?.removeAttribute('data-dragging');
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
  };
}

// React's onWheel listener is passive, so it can't stop the page scrolling.
export function usePlotMinimapWheel(
  containerRef: RefObject<HTMLElement | null>,
  boxRef: RefObject<HTMLElement | null>,
  mounted: boolean
) {
  useEffect(() => {
    const container = containerRef.current;
    const box = boxRef.current;
    if (!mounted || !container || !box) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? PLOT_MINIMAP_WHEEL_LINE_HEIGHT
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? container.clientHeight
            : 1;
      let dx = event.deltaX * unit;
      let dy = event.deltaY * unit;
      // Some browsers already turn Shift+wheel into deltaX.
      if (event.shiftKey && !dx) [dx, dy] = [dy, 0];
      container.scrollTo({
        left: container.scrollLeft + dx,
        top: container.scrollTop + dy,
        behavior: 'auto',
      });
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, [containerRef, boxRef, mounted]);
}
