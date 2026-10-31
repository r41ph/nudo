# Tasks: Plot sidebar

> Plan: `docs/specs/plot-sidebar.plan.md` · Spec: `docs/specs/plot-sidebar.md`
> Run focused tests with `pnpm test:web <filter>`. Typecheck runs in pre-push.
> Query context7 before using jotai, @dnd-kit, shadcn or Testing Library APIs.

## Phase 1: Foundation

## Task 1: Visible plot, counter maths, export `orderAnnouncements`

**Description:** Add the pure helpers that the board, sidebar and counter share,
and export the existing announcements builder so the sidebar can reuse it.

**Acceptance criteria:**
- [ ] `visiblePlot(plot, { hiddenPlotlineIds, hiddenBeatIds })` returns plotlines, beats and cards in visible plotline × visible beat cells. Order is kept and unknown ids are ignored.
- [ ] `plotCounterLabel(plot, view)` returns "5 plotlines · 8 beats · 33 cards" when nothing is hidden, otherwise "4 of 5 plotlines · 7 of 8 beats · N cards" (using `countLabel` for plurals).
- [ ] `orderAnnouncements` is exported unchanged; `reorderedIds` gets a test with a hidden neighbour (full-list semantics).

**Verification:**
- [ ] `pnpm test:web plot.utils plot-dnd`
- [ ] `pnpm lint`

**Dependencies:** None
**Files:** `features/plot/lib/plot.utils.ts` (+ test), `features/plot/lib/plot-dnd.ts` (+ test)
**Scope:** S

## Task 2: `plot-view` store

**Description:** Persist the hidden ids per project in a Jotai atom with
storage that never throws.

**Acceptance criteria:**
- [ ] `usePlotView(projectId)` returns `{ view, toggle(kind, id), showAll(kind?), isHidden(kind, id) }`, backed by `atomWithStorage` at `nudo:plot-view:<projectId>`, with one atom per project memoised on `projectId` (no `atomFamily`).
- [ ] When storage reads or writes throw, the default is "nothing hidden" and nothing crashes. Ids unknown to the current plot are pruned on the next write.
- [ ] Two projects keep separate state.

**Verification:**
- [ ] `pnpm test:web plot-view` (including a test where storage throws)

**Dependencies:** None (Task 1 for the pruning helper, if shared)
**Files:** `features/plot/state/plot-view.store.ts` (+ test), maybe `features/plot/constants/plot.constants.ts` (key prefix)
**Scope:** S

### Checkpoint A
- [ ] Unit tests green, lint clean, no UI change. Commit.

## Phase 2: Vertical slices

## Task 3: Plot route shows `PlotSidebarPanel`

**Description:** `AppSidebar` renders the panel on `/project/:projectId/plot`
and `DraftSection` elsewhere. The panel lays out the two sections (fixed header
with a disabled Show all, a scrolling list of rows showing name and plotline
card count) and the counter, following the spec §5/§17 layout contract.

**Acceptance criteria:**
- [ ] On the Plot route the sidebar shows the Plotlines and Beats lists plus a `role="status"` counter. Other routes show Draft, unchanged.
- [ ] `SidebarContent` is `overflow-hidden` on the Plot route. Each `<ul>` is its own `min-h-0 overflow-y-auto` scroller, and each section has the `header + 3 rows` minimum.
- [ ] Pending shows skeleton rows. A load error with no data leaves the panel body empty. Not started shows only the counter, with no New rows.

**Verification:**
- [ ] `pnpm test:web app-sidebar plot-sidebar`
- [ ] Storybook: `PlotSidebarPanel` (default, dense) and `PlotFilterSection` (few, overflowing) in `packages/ui/stories/`
- [ ] Manual: 640px-tall window, so the lists scroll independently

**Dependencies:** Task 1
**Files:** `features/sidebar/components/app-sidebar.tsx`, `features/plot/components/sidebar/plot-sidebar-panel.tsx` (+ test), `plot-filter-section.tsx`, `plot-filter-row.tsx`, `plot-counter.tsx`, stories
**Scope:** M

## Task 4: New rows; delete `PlotHeader`

**Description:** Add "New plotline" / "New beat" as the last item of each list
(editable only). They create items and scroll the new item into view. Remove the
board header, which they replace.

**Acceptance criteria:**
- [ ] Clicking New plotline / New beat creates a visible item, as Add plotline / Add beat did, and scrolls it into view in its list. `addPlotline` / `addBeat` return the new id.
- [ ] `plot-header.tsx` is deleted and the board has no header. The refresh-failed alert, view-only notice and **+ Plotline** stay, and the grid starts with 40px top padding.
- [ ] No New rows when `!editable`.

**Verification:**
- [ ] `pnpm test:web plot-sidebar plot-board use-plot-mutations plot-page` (update the header assertions in existing tests)
- [ ] Storybook: `plot-page.stories.tsx` still renders

**Dependencies:** Task 3
**Files:** `plot-filter-section.tsx`, `hooks/use-plot-mutations.ts`, `board/plot-board.tsx`, `board/plot-header.tsx` (delete), tests
**Scope:** M

## Task 5: Checkbox filtering

**Description:** Vendor shadcn `Checkbox` and put it with the name in a `Label`
on each row. Toggling hides or shows the board row or column. Show all clears
its section, and the counter reflects the filter.

**Acceptance criteria:**
- [ ] `npx shadcn@latest add checkbox` (no new npm dependency). Plotline checkboxes use the `bg-plot-*` fill or outline; beats use `prose`. The accessible name is "Show <name>". Hidden rows show the name muted.
- [ ] The board renders `visiblePlot(...)`: rows, columns, `gridTemplateColumns` and the board `SortableContext` items are visible-only. Move up/down, `isFirst` / `isLast` and drop reorders use the full order.
- [ ] Show all is disabled when nothing in its section is hidden and restores the section otherwise. The counter text updates.

**Verification:**
- [ ] `pnpm test:web plot-sidebar plot-board plot-board-dnd`
- [ ] Storybook: `PlotFilterRow` (visible, hidden, long name, view-only); `PlotSidebarPanel` filtered

**Dependencies:** Tasks 2, 3
**Files:** `packages/ui/src/components/ui/checkbox.tsx` (generated), `plot-filter-row.tsx`, `plot-filter-section.tsx`, `plot-counter.tsx`, `board/plot-board.tsx`, tests, stories
**Scope:** M

## Task 6: Everything hidden, persistence, view-only

**Description:** Cover the remaining filter behaviours.

**Acceptance criteria:**
- [ ] If all plotlines or all beats are hidden (at least one actually hidden), the board shows "Everything is hidden." with Show all, which clears both filters. A plot with no plotlines or no beats keeps the current empty behaviour.
- [ ] The filter survives an unmount and remount (and a reload, via storage) per project.
- [ ] Below 1024px there are no handles or New rows, but checkboxes and Show all work.

**Verification:**
- [ ] `pnpm test:web plot-sidebar plot-board`
- [ ] Storybook: `PlotBoard` everything hidden; `PlotFilterSection` all hidden

**Dependencies:** Task 5
**Files:** `board/plot-board.tsx`, `plot-sidebar-panel.test.tsx`, `plot-board.test.tsx`, stories
**Scope:** S

### Checkpoint B
- [ ] Focused web tests green and lint clean
- [ ] Manual in `pnpm dev`: filter, add, reload
- [ ] **Stop for human review before Task 7.** Commit.

## Phase 3: Reorder

## Task 7: Sidebar reorder

**Description:** The panel has its own `DndContext` and one vertical
`SortableContext` per section. The drag starts only from `ReorderHandle`, which
is hidden by opacity until hover, `:focus-within` or `pointer-coarse`. Drops
call `reorderedIds(fullIds, …)` → `reorderPlotlines` / `reorderBeats`.

**Acceptance criteria:**
- [ ] Pointer (distance 6) and keyboard (`PLOT_DRAG_KEYS`) reorder within a section only. Hidden items can be dragged and stay hidden. The board order follows immediately.
- [ ] Screen-reader instructions come from `PLOT_DRAG_INSTRUCTIONS`, and the announcements come from the exported `orderAnnouncements`. There's a `DragOverlay` row (dot + name), the source row is faded, and a 2px accent drop line shows.
- [ ] A failed reorder rolls back both surfaces with the existing `PLOT_SAVE_ERROR` toast. Board pointer drag is unchanged (the `useReorderSortable` default).

**Verification:**
- [ ] `pnpm test:web plot-sidebar plot-board-dnd reorder-handle`
- [ ] Storybook: `PlotFilterRow` dragging
- [ ] Manual: drag with 20 items, and auto-scroll works within the list

**Dependencies:** Tasks 1, 3 (5 for the hidden-item case)
**Files:** `plot-sidebar-panel.tsx`, `plot-filter-section.tsx`, `plot-filter-row.tsx`, `board/reorder-handle.tsx`, tests
**Scope:** M

### Checkpoint C
- [ ] Board and sidebar orders match; existing board DnD tests green. Commit.

## Phase 4: Journeys and finish

## Task 8: E2E

**Acceptance criteria:**
- [ ] `plot.spec.ts`: hide a plotline and a beat → the board updates → reload → still hidden.
- [ ] `reorder.spec.ts`: drag a plotline in the sidebar (`fixtures/dnd.ts`) → the board order matches after a reload.
- [ ] Independent scroll: with 20 plotlines and 20 beats, scrolling the plotlines list leaves the beats list's `scrollTop`, both headers and the counter's bounding box unchanged.

**Verification:**
- [ ] `pnpm test:e2e` (plot and reorder specs)

**Dependencies:** Tasks 6, 7
**Files:** `e2e/tests/plot.spec.ts`, `e2e/tests/reorder.spec.ts`
**Scope:** S

## Task 9: Docs and PR

**Acceptance criteria:**
- [ ] `docs/specs/plot.md` amended per spec §13 (§7.1, §12, §12–13 note). `CLAUDE.md` / `.claude/rules/*` updated only if a convention changed.
- [ ] Branch pushed and the PR opened with `Spec: docs/specs/plot-sidebar.md` and `Design handoff: docs/design-handoffs/plot-sidebar/README.md`.
- [ ] The spec gets `> Status: In review (PR #NN — <url>)` in the same PR. The handoff stays frozen.

**Verification:**
- [ ] The pre-push hook (commitlint + typecheck) passes
- [ ] Spec §20 checklist ticked

**Dependencies:** Task 8
**Scope:** S
