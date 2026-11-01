# Implementation Plan: Plot minimap

> Spec: `docs/specs/plot-minimap.md` (Approved)
> Visual reference: `docs/design-handoffs/plot-minimap/` (PNGs only)
> Branch / worktree: `feat/plot-minimap` at `../plot-minimap`
> Tasks: `docs/specs/plot-minimap.tasks.md`

## Overview

A new `PlotMinimap` floats bottom-right over the Plot board's scroll container.
It shows a scaled drawing of the board's card marks and a frame for the visible
part. Dragging the frame, pressing in the miniature, wheel or keys scroll the
board on both axes. It is web-only: no API, no new dependencies, no new tokens.

This ships as one PR. Each task leaves the board working. The minimap starts
as an inert miniature (Task 2), then gains the frame, pointer, then keyboard,
so every task can be tested on its own.

## Dependency graph

```
T1 constants + pure geometry (plot-minimap.ts)
        │
T2 board wrapper/refs + measuring hook + box + marks (overflow-gated)
        │
T3 frame + rAF scroll sync
        │
        ├── T4 pointer drag / press-to-centre / wheel / card-drag dimming
        └── T5 keyboard, tooltip, status announcements
                │
        T6 e2e (needs T4 + T5)  →  T7 docs + PR
```

T4 and T5 only share the frame element, so they can be done in either order.

## Architecture decisions

- **Geometry is pure** (`lib/plot-minimap.ts`). It works in board pixels on
  `MinimapMetrics` (spec §13, including `originX/Y` and `maxScroll*`). It also
  holds `visibleRange` and the position text, and a `keyTarget(key, mods,
  metrics, columns, rows)` that returns the `{ left, top }` for each key in §8.
  The hook and the component only measure the DOM and apply results.
- **Measuring.** `use-plot-minimap.ts` reads the rects of the grid,
  `[role="columnheader"]` (beat columns), `[role="rowheader"]` (plotline rows)
  and the card elements. It does this from a `ResizeObserver` on the grid and
  the scroll container, and again when the visible plot changes. The sidebar
  checkboxes (`usePlotView`) change the visible plot, and so do card, order
  and colour edits. `visiblePlot()` returns a new object on every render, so
  the effect is keyed on a stable signature instead: visible beat ids,
  plotline ids, `cardId@cell`, and colours. After every re-measure the frame
  is re-synced from the current scroll. Shrinking the board makes the browser
  clamp the scroll, and the frame must not depend on a `scroll` event firing
  for that. The layout snapshot (region size, card rects in region
  coordinates, column and row extents) is React state, because it changes
  rarely. Scroll position never is: a passive `scroll` listener schedules one
  rAF that writes the frame's `transform`/`width`/`height` through a ref.
- **Overflow gating** comes from the same measurement: `scrollWidth >
  clientWidth || scrollHeight > clientHeight`. When nothing overflows,
  `PlotMinimap` returns `null`. The hook still observes, so the minimap comes
  back as soon as something overflows.
- **Finding cards (approved).** Card elements had no stable hook, so the
  `PlotCard` root gets `data-card-id={card.id}`. Each id is looked up in
  `visible.cards` to get its plotline colour. This is the one approved change
  outside spec §12. Walking `[role="cell"]` children by DOM order was rejected,
  because it breaks silently when the card markup changes.
- **Scrolling** always goes through `container.scrollTo({ left, top,
  behavior })`. `behavior` is `'smooth'` for jumps (press, keys), unless
  `prefers-reduced-motion: reduce`. It is always `'auto'` for drag and wheel.
- **Wheel** uses a non-passive `wheel` listener added in an effect, because
  React's `onWheel` is passive and can't `preventDefault`.
- **Pointer** uses `onPointerDown` on the miniature with `setPointerCapture`.
  A press on the frame keeps the grab offset; a press elsewhere centres the
  view there, then drags with the grab offset at the frame's centre.
- **Accessibility.** The frame is a styled `div` (`role="group"`,
  `aria-roledescription="minimap"`, `aria-label="Board position"`,
  `aria-controls`), wrapped by `Tooltip` from `@ui/components/ui/tooltip`.
  It is the only focusable element. A visually hidden `role="status"`
  announces the position text 300ms after the last key move.
- **Board changes** stay within spec §12: a `relative min-h-0 flex-1 flex
  flex-col` wrapper, refs on the scroll container and grid, an `id` on the
  scroll container, `<PlotMinimap>` rendered as a sibling of the scroll
  container (so it doesn't scroll), plus the approved `data-card-id` above.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| jsdom has no layout, so component tests can't see real geometry | Stub `getBoundingClientRect`, `scroll*`/`client*` and `ResizeObserver` in a small test helper. The real geometry is covered by the pure unit tests and the e2e. |
| jsdom lacks `setPointerCapture` / `PointerEvent` details | Stub the capture methods on `Element.prototype` in the minimap test; build events with `fireEvent.pointerDown(el, { clientX, clientY, pointerId })`. |
| The minimap blocks dnd-kit drops or catches its pointer events | `pointer-events-none opacity-40` while `dragging` is set; e2e drag tests keep passing. |
| The frame lags behind the scroll or re-renders the board | Write the frame in rAF through a ref; a component test asserts the marks/board don't re-render on scroll (render counter). |
| Sidebar filters change the board's size under the minimap (overflow appears or disappears, the scroll is clamped, the counts change) | Re-measure on the visible-plot signature and on `ResizeObserver`; re-sync the frame after each measure. Covered by component tests that toggle filters and by an e2e step. |
| Sticky gutter (`px-10`) makes view mapping wrong at the start | `originX/Y` from rects, plus unit tests at scrollLeft 0, 20 and 40. |
| The tooltip steals focus or covers the frame | Tooltip opens on hover/focus only, `side="top"`. Check visually in Storybook. |

## Verification checkpoints

- **After T2:** `pnpm test:web plot-minimap plot-board`, and the board e2e
  still passes (`pnpm test:e2e plot`). The minimap appears in Storybook in
  light and dark.
- **After T5:** every success criterion in spec §16 except e2e can be checked
  by hand in `pnpm dev:web`.
- **After T6:** the full §16 checklist; lint is clean. Typecheck runs in pre-push.

## Open

- Spec §17: tune `PLOT_MINIMAP_MAX_HEIGHT` / `PLOT_MINIMAP_MIN_FRAME` after
  trying it on a real manuscript. Not blocking.
