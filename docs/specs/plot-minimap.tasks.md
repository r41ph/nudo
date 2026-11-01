# Tasks: Plot minimap

> Plan: `docs/specs/plot-minimap.plan.md` · Spec: `docs/specs/plot-minimap.md`
> Run focused tests with `pnpm test:web <filter>`. Typecheck runs in pre-push.
> Query context7 before using React, Radix Tooltip, Testing Library, Storybook
> or Playwright APIs.

## Phase 1: Foundation

## Task 1: Constants and pure geometry

**Description:** Add the §9 constants and the pure functions that every later
task relies on, written test-first.

**Acceptance criteria:**
- [x] §9 constants in `plot.constants.ts`.
- [x] `lib/plot-minimap.ts` exports `MinimapMetrics` (spec §13), `viewFromScroll`, `minimapScale`, `frameRect`, `scrollForFrameAt`, `scrollToCentreOn`, `visibleRange`, `positionLabel` and `keyTarget`. It also exports `scrollForView` and `markRect`, which Tasks 2–5 use.
- [x] Unit tests cover the §14 unit list: start, middle and end; one-axis and two-axis overflow; width- vs height-limited scale; clamping at each edge; minimum frame size; centring near the edges; `originX` gutter at scrollLeft 0, 20 and 40; scroll past the region (the "+ Plotline" area) keeps the frame clamped; "Beats 2–4 of 15 · Plotlines 1–3 of 4".
- [x] `keyTarget` covers every key in §8: ←/→ align to a column's left edge just right of the label column, ↑/↓ to a row's top just below the header, PageUp/Down, Shift+PageUp/Down, Home/End keep the vertical position, and Ctrl/⌘+Home/End.

**Verification:**
- [x] `pnpm test:web plot-minimap`
- [x] `pnpm lint`

**Dependencies:** None
**Files:** `constants/plot.constants.ts`, `lib/plot-minimap.ts`, `lib/plot-minimap.test.ts`
**Scope:** M

## Phase 2: Miniature

## Task 2: Board wrapper, measuring hook, box and marks

**Description:** Wrap the scroll container, measure the board, and render the
minimap box with one mark per visible card. It only appears when the board
overflows. No frame yet.

**Acceptance criteria:**
- [x] `plot-board.tsx` gets only the §12 changes: wrapper, refs, scroll container `id`, `<PlotMinimap>`. `plot-card.tsx` gets `data-card-id` (approved, see the plan).
- [x] `use-plot-minimap.ts` measures on `ResizeObserver` (grid + container) and on a stable visible-plot signature (visible beat ids, plotline ids, `cardId@cell`, colours), never on scroll and never on every render. It reports overflow, the layout snapshot and the scrollbar offsets.
- [x] The box matches §4 (position, `w-64`, padding, `bg-popover`, border, `shadow-lg dark:shadow-black/45`, `z-30`, scrollbar offsets). The miniature is `aria-hidden` and sized by §5.
- [x] Marks: plotline colour via `PLOTLINE_COLOR_VAR`, `opacity-55 dark:opacity-80`, minimum 4×2px, `rounded-[1px]`.
- [x] Not rendered without overflow, in "Everything is hidden.", or when there are no visible cards and no overflow. Works in view-only mode.
- [x] Component tests (`plot-minimap.test.tsx`, using the board harness and a layout-stub helper): no minimap without overflow; present with X-only and with Y-only overflow; one mark per visible card; hidden plotlines and beats give no marks; adding a card adds a mark.
- [x] Sidebar filters (via `usePlotView` toggles in the test): hiding beats until nothing overflows removes the minimap; showing them again brings it back; hiding a plotline removes its marks and re-scales the miniature; a board that loads with items already hidden (persisted view) is measured correctly the first time.
- [x] Story `plot-minimap.stories.tsx`: wide, tall (height-limited) and both-axes boards, light and dark.

**Verification:**
- [x] `pnpm test:web plot-minimap plot-board`
- [x] `pnpm test:e2e plot` (existing board journeys still pass)
- [x] Storybook check in both themes against the reference PNGs

**Dependencies:** Task 1
**Files:** `components/board/plot-board.tsx`, `components/board/plot-minimap.tsx` (+ test), `hooks/use-plot-minimap.ts`, `packages/ui/stories/plot-minimap.stories.tsx`, (`components/board/plot-card.tsx`)
**Scope:** M

## Task 3: Frame and scroll sync

**Description:** Draw the frame and keep it in step with the board's scroll
without React state.

**Acceptance criteria:**
- [x] Frame size and position follow §6 on both axes, clamped, with a 12px minimum. Look: `bg-foreground/8 dark:bg-foreground/10`, `rounded-[3px]`, `cursor-grab`, a 1.5px `foreground`/60 outline on hover and focus-visible.
- [x] A passive `scroll` listener plus one rAF writes `transform`/size through a ref. The board and the marks don't re-render on scroll (asserted with a render counter).
- [x] Component test: firing `scroll` after changing the stubbed `scrollLeft`/`scrollTop` moves the frame's transform.
- [x] After a re-measure (e.g. beats hidden from the sidebar shrink the board and the stubbed scroll is clamped), the frame is re-synced from the current scroll without a `scroll` event.
- [x] Story: frame scrolled to the middle.

**Verification:**
- [x] `pnpm test:web plot-minimap`

**Dependencies:** Task 2
**Files:** `components/board/plot-minimap.tsx` (+ test), `hooks/use-plot-minimap.ts`, stories
**Scope:** S

### Checkpoint: miniature and frame
- [x] Tests pass; the board e2e still passes; it looks right in Storybook in both themes.

## Phase 3: Navigation

## Task 4: Pointer drag, press-to-centre, wheel, drag dimming

**Description:** Make the minimap a pointer and wheel control for the board.

**Acceptance criteria:**
- [x] Dragging the frame scrolls on both axes, live, keeping the grab point under the pointer (no jump), with pointer capture. `cursor-grabbing` and the outline show while dragging.
- [x] Pressing elsewhere centres the view there (smooth unless reduced motion); holding continues as a drag.
- [x] A non-passive `wheel` listener maps `deltaX`/`deltaY` onto the board, turns Shift+wheel into horizontal, and calls `preventDefault`.
- [x] While `dragging` is set the minimap is `pointer-events-none opacity-40`.
- [x] Component tests: drag sets `scrollLeft`/`scrollTop` with the offset kept; press centres; wheel scrolls and is default-prevented; reduced motion uses `behavior: 'auto'`; dimmed during a card drag.
- [x] Story: card drag in progress.

**Verification:**
- [x] `pnpm test:web plot-minimap plot-board-dnd`

**Dependencies:** Task 3
**Files:** `components/board/plot-minimap.tsx` (+ test), `hooks/use-plot-minimap.ts`, stories
**Scope:** M

## Task 5: Keyboard, tooltip, announcements

**Description:** Make the frame focusable and keyboard-driven, with its
position shown and announced.

**Acceptance criteria:**
- [x] The frame has `tabIndex={0}`, `role="group"`, `aria-roledescription="minimap"`, `aria-label="Board position"` and `aria-controls={scrollContainerId}`. It comes after the board in tab order.
- [x] Each key in §8 scrolls through `keyTarget` and prevents the default (⌘ on macOS, Ctrl elsewhere).
- [x] `Tooltip` shows the position text on hover and focus. A visually hidden `role="status"` announces it 300ms after the last key move, never on plain scroll.
- [x] Component tests: every key gives the expected `scrollLeft`/`scrollTop`; the status text after a key move (fake timers); no announcement after a plain scroll; after hiding beats or plotlines, the counts use only visible items ("of 12", not "of 15") and ←/→ skip the hidden columns.
- [x] Story: frame focused (`play` focusing the frame).

**Verification:**
- [x] `pnpm test:web plot-minimap`
- [ ] Manual check with a screen reader in `pnpm dev:web` (Orca or VoiceOver)

**Dependencies:** Task 3 (and Task 1's `keyTarget`)
**Files:** `components/board/plot-minimap.tsx` (+ test), `hooks/use-plot-minimap.ts`, stories
**Scope:** M

### Checkpoint: feature complete
- [ ] Every §16 criterion except e2e checked by hand in `pnpm dev:web`, light and dark, including reduced motion and card, beat and plotline drags under the minimap.

## Phase 4: Journey and finish

## Task 6: E2E

**Description:** Extend `e2e/tests/plot.spec.ts` with a board that overflows
both ways.

**Acceptance criteria:**
- [x] Seed enough beats and plotlines to overflow both axes at the default viewport.
- [x] A diagonal frame drag (`page.mouse`) scrolls on both axes; pressing a miniature corner centres there; arrow keys on the focused frame move by beat and plotline; scrolling the board moves the frame.
- [x] Unchecking beats in the sidebar until the board fits removes the minimap; checking them again brings it back, and the frame matches the scroll position.

**Verification:**
- [x] `pnpm test:e2e plot`

**Dependencies:** Tasks 4, 5
**Files:** `e2e/tests/plot.spec.ts`
**Scope:** S

## Task 7: Docs and PR

**Description:** Close the loop between the spec and the PR.

**Acceptance criteria:**
- [ ] `CLAUDE.md` / `.claude/rules/*` updated only if a convention changed (e.g. the layout-stub test helper, if it's reusable).
- [ ] **Ask before pushing** (spec §15). Then push and open the PR with `Spec: docs/specs/plot-minimap.md`, and set the spec's `> Status: In review (PR #NN — <url>)` in a `docs:` commit on the same branch.

**Verification:**
- [ ] The §16 checklist is all ticked; pre-push hooks pass.

**Dependencies:** Task 6
**Scope:** S
