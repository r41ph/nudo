import { vi } from 'vitest';
import { act } from '@testing-library/react';

// jsdom has no layout. This lays the board out on a fixed grid, read from the
// rendered DOM at call time, so hiding beats or adding cards changes the
// rects and scroll sizes the way a browser would.
export const LAYOUT = {
  gutter: 40,
  label: 180,
  beat: 240,
  header: 48,
  row: 160,
  card: 60,
  cardGap: 8,
  addPlotline: 40,
  bottomPadding: 32,
} as const;

export interface Viewport {
  width: number;
  height: number;
  // The native scrollbar's thickness, taken from the client size.
  scrollbar?: number;
}

const rect = (x: number, y: number, width: number, height: number) =>
  ({
    x,
    y,
    left: x,
    top: y,
    width,
    height,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  }) as DOMRect;

const gridOf = (el: Element) =>
  el.querySelector<HTMLElement>(':scope > [role="table"]');

const plotlineRows = (grid: Element) =>
  [...grid.querySelectorAll(':scope > [role="row"]')].filter((row) =>
    row.querySelector(':scope > [role="rowheader"]')
  );

export function stubBoardLayout(initial: Viewport) {
  let viewport = { scrollbar: 0, ...initial };
  const scroll = new WeakMap<Element, { left: number; top: number }>();
  const observers = new Set<ResizeObserverCallback>();

  const content = (container: Element) => {
    const grid = gridOf(container)!;
    const beats = grid.querySelectorAll('[role="columnheader"]').length;
    const rows = plotlineRows(grid).length;
    const addButton = container.querySelector(':scope > button')
      ? LAYOUT.addPlotline
      : 0;
    const gridWidth = LAYOUT.label + beats * LAYOUT.beat;
    const gridHeight = LAYOUT.header + rows * LAYOUT.row;
    return {
      gridWidth,
      gridHeight,
      width: LAYOUT.gutter * 2 + gridWidth,
      height: gridHeight + addButton + LAYOUT.bottomPadding,
    };
  };
  const clientWidth = () => viewport.width - viewport.scrollbar;
  const clientHeight = () => viewport.height - viewport.scrollbar;
  const containerOf = (el: Element) =>
    el.closest('[role="table"]')?.parentElement ?? null;
  const scrollOf = (container: Element) =>
    scroll.get(container) ?? { left: 0, top: 0 };
  const maxScroll = (container: Element) => {
    const size = content(container);
    return {
      left: Math.max(0, size.width - clientWidth()),
      top: Math.max(0, size.height - clientHeight()),
    };
  };

  function rectOf(el: Element): DOMRect {
    if (gridOf(el)) return rect(0, 0, viewport.width, viewport.height);
    const container = containerOf(el);
    if (!container) return rect(0, 0, 0, 0);
    const grid = gridOf(container)!;
    const { left, top } = scrollOf(container);
    const gx = LAYOUT.gutter - left;
    const gy = -top;
    const role = el.getAttribute('role');
    if (el === grid) {
      const size = content(container);
      return rect(gx, gy, size.gridWidth, size.gridHeight);
    }
    if (role === 'columnheader') {
      const i = [...grid.querySelectorAll('[role="columnheader"]')].indexOf(el);
      return rect(
        gx + LAYOUT.label + i * LAYOUT.beat,
        Math.max(gy, 0),
        LAYOUT.beat,
        LAYOUT.header
      );
    }
    if (role === 'rowheader') {
      const j = plotlineRows(grid).indexOf(el.parentElement!);
      return rect(
        Math.max(gx, 0),
        gy + LAYOUT.header + j * LAYOUT.row,
        LAYOUT.label,
        LAYOUT.row
      );
    }
    if (el instanceof HTMLElement && el.dataset.cardId) {
      const cell = el.closest('[role="cell"]')!;
      const row = cell.parentElement!;
      const i = [...row.querySelectorAll(':scope > [role="cell"]')].indexOf(
        cell
      );
      const j = plotlineRows(grid).indexOf(row);
      const k = [...cell.querySelectorAll('[data-card-id]')].indexOf(el);
      return rect(
        gx + LAYOUT.label + i * LAYOUT.beat + LAYOUT.cardGap,
        gy +
          LAYOUT.header +
          j * LAYOUT.row +
          LAYOUT.cardGap +
          k * (LAYOUT.card + LAYOUT.cardGap),
        LAYOUT.beat - 2 * LAYOUT.cardGap,
        LAYOUT.card
      );
    }
    return rect(0, 0, 0, 0);
  }

  const isContainer = (el: Element) => gridOf(el) !== null;
  const spies = [
    vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: Element) {
        return rectOf(this);
      }),
    vi
      .spyOn(Element.prototype, 'scrollWidth', 'get')
      .mockImplementation(function (this: Element) {
        return isContainer(this) ? content(this).width : 0;
      }),
    vi
      .spyOn(Element.prototype, 'scrollHeight', 'get')
      .mockImplementation(function (this: Element) {
        return isContainer(this) ? content(this).height : 0;
      }),
    vi
      .spyOn(Element.prototype, 'clientWidth', 'get')
      .mockImplementation(function (this: Element) {
        return isContainer(this) ? clientWidth() : 0;
      }),
    vi
      .spyOn(Element.prototype, 'clientHeight', 'get')
      .mockImplementation(function (this: Element) {
        return isContainer(this) ? clientHeight() : 0;
      }),
    vi
      .spyOn(Element.prototype, 'scrollLeft', 'get')
      .mockImplementation(function (this: Element) {
        return scrollOf(this).left;
      }),
    vi
      .spyOn(Element.prototype, 'scrollTop', 'get')
      .mockImplementation(function (this: Element) {
        return scrollOf(this).top;
      }),
    vi
      .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return isContainer(this) ? viewport.width : 0;
      }),
    vi
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return isContainer(this) ? viewport.height : 0;
      }),
  ];

  vi.stubGlobal(
    'ResizeObserver',
    class {
      private callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe() {
        observers.add(this.callback);
      }
      unobserve() {}
      disconnect() {
        observers.delete(this.callback);
      }
    }
  );

  return {
    // Like a window resize: the browser reports it through ResizeObserver.
    resize(next: Viewport) {
      viewport = { scrollbar: 0, ...next };
      act(() => {
        observers.forEach((callback) => callback([], {} as ResizeObserver));
      });
    },
    // Clamped like a browser's scroll position.
    scrollTo(container: Element, left: number, top: number) {
      const max = maxScroll(container);
      scroll.set(container, {
        left: Math.min(Math.max(left, 0), max.left),
        top: Math.min(Math.max(top, 0), max.top),
      });
    },
    restore() {
      spies.forEach((spy) => spy.mockRestore());
      vi.unstubAllGlobals();
    },
  };
}
