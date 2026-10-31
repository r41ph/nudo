# Implementation Plan: Plot sidebar

> Spec: `docs/specs/plot-sidebar.md` (Approved)
> Design handoff: `docs/design-handoffs/plot-sidebar/README.md`
> Branch / worktree: `feat/plot-sidebar` at `../feat-plot-sidebar`
> Tasks: `docs/specs/plot-sidebar.tasks.md`

## Overview

On the Plot route, the sidebar body changes from `DraftSection` to a new
`PlotSidebarPanel`. The panel has two independently scrolling, sortable,
filterable lists (Plotlines, Beats), each ending in a New row, and a counter
pinned above the account button. The board loses `PlotHeader` and renders only
the visible rows and columns. There are no API changes and no new dependencies.
The only vendored addition is shadcn `Checkbox`.

This ships as one PR. Each task leaves the app working: the header's add
actions move to the sidebar in the same task that deletes the header.

## Dependency graph

```
visiblePlot / counter maths (plot.utils)      orderAnnouncements export (plot-dnd)
        │                                              │
plot-view store (hidden ids, persisted)                │
        │                                              │
        ├── T3 panel shell: route switch, sections, rows, counter
        │       │
        │       ├── T4 New rows + delete PlotHeader
        │       ├── T5 checkbox filter ⇄ board rows/columns ⇄ counter
        │       │       └── T6 everything-hidden, persistence, view-only
        │       └── T7 sidebar DnD reorder ───────────────┘
        │
        └── T8 e2e  →  T9 docs + PR
```

## Architecture decisions

- **One order source.** The sidebar and board both read `['plot', projectId]`
  through `usePlot`. Sidebar reorder calls the existing
  `reorderPlotlines` / `reorderBeats`. Nothing is mirrored in Jotai.
- **Filter state** goes in `features/plot/state/plot-view.store.ts`: an
  `atomWithStorage` created per project inside a `usePlotView(projectId)` hook
  (memoised on `projectId`, not `atomFamily`). A custom storage wraps
  `localStorage` in try/catch. The value shape is
  `{ hiddenPlotlineIds, hiddenBeatIds }`, so the later `plot.md` §12 settings
  can join it. Check `atomWithStorage` / `createJSONStorage` and `getOnInit`
  in context7 before writing it.
- **Pure filtering.** `visiblePlot(plot, view)` and a `plotCounterLabel(...)`
  helper go in `plot.utils.ts`. The board, the counter and the sidebar rows
  consume them, and no component recomputes visibility.
- **Board reorder uses the full order.** The board's `SortableContext` gets the
  *visible* ids, which are what it renders. `reorderedIds`, `moveId`, `isFirst`
  and `isLast` keep using the full id lists (spec §8).
- **Handle-only drag in the sidebar.** `useReorderSortable` spreads pointer
  `listeners` on the whole container, which is right for the board but
  forbidden in the sidebar (§19). Add an option to the hook (e.g.
  `activator: 'container' | 'handle'`, default `'container'`) so the sidebar
  puts the listeners on `ReorderHandle`. The board's behaviour is unchanged.
- **Panel states the spec doesn't cover:** skeleton rows while `usePlot` is
  pending. The panel body is empty after a load error with no data, because the
  board already shows the error and Retry. When the plot isn't started (no
  plotlines and no beats, so the board shows `PlotEmpty`), the panel shows only
  the counter and no New rows, so starting a plot stays on the board.
- **Separate `DndContext`** for the panel, with the same sensors as the board
  (§9). Announcements reuse the newly exported `orderAnnouncements`.
- **Scroll into view after New** needs the new id, so `addPlotline()` /
  `addBeat()` return the id they already generate. This is a return value, not a
  new mutation.
- **Stories location:** the repo keeps plot stories in `packages/ui/stories/`
  (`plot-*.stories.tsx`), not next to the components as spec §16 sketches.
  Follow the repo.

## Task list

### Phase 1: Foundation (pure logic, no UI)
- [ ] Task 1: `visiblePlot`, counter maths, export `orderAnnouncements`
- [ ] Task 2: `plot-view` store with safe persisted storage

### Checkpoint A
- [ ] Unit tests green; `pnpm lint` clean; nothing user-visible changed

### Phase 2: Vertical slices
- [ ] Task 3: Plot route renders `PlotSidebarPanel` (sections, rows, counter, independent scroll layout)
- [ ] Task 4: New plotline / New beat rows; delete `PlotHeader`
- [ ] Task 5: Checkbox filtering hides/shows board rows and columns; Show all; counter reflects it
- [ ] Task 6: "Everything is hidden" board state, persistence across remount, and view-only filtering

### Checkpoint B
- [ ] Web integration green for app-sidebar, plot-sidebar and plot-board
- [ ] Manual: `pnpm dev`, filter and add from the sidebar, reload, still filtered
- [ ] Human review before DnD

### Phase 3: Reorder
- [ ] Task 7: Sidebar drag and keyboard reorder (handle-only, overlay, drop line, announcements, rollback)

### Checkpoint C
- [ ] Board and sidebar orders always match; board drag unchanged (existing `plot-board-dnd` tests green)

### Phase 4: Journeys and finish
- [ ] Task 8: E2E: filter persists, sidebar drag persists, independent scroll
- [ ] Task 9: Docs amendments, then the PR and the spec status link

### Checkpoint: Complete
- [ ] Spec §20 success criteria all met
- [ ] Testing DoD (`.claude/rules/testing.md`) met; pre-push typecheck passes
- [ ] PR open; spec and handoff linked to it

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Sidebar flex/scroll layout breaks: `SidebarContent` is `overflow-auto`, so a nested `min-h-0` chain fails and the whole body scrolls | High | Done in T3 with `overflow-hidden` on `SidebarContent`; T8 e2e asserts headers, counter and other list stay still. Manual check at 640px height. |
| Board `SortableContext` with visible ids vs `reorderedIds` with full ids gives off-by-one drops | Med | Unit test `reorderedIds` with a hidden neighbour; integration test board keyboard move with a hidden item (T5). |
| Changing `useReorderSortable` regresses board drag | Med | Default keeps current behaviour; existing `plot-board-dnd.test.tsx` must stay green (Checkpoint C). |
| `atomWithStorage` initial read: a hydration flash shows hidden items for one frame | Low | Use `getOnInit: true` (confirm in context7); unit-test the throwing-storage fallback. |
| dnd-kit auto-scroll doesn't pick the section list as its scroll ancestor | Low | Confirm defaults in context7; verify by hand with 20 items. Ask before adding `@dnd-kit/modifiers`. |

## Resolved questions (2026-10-31)

1. **Handle-only activator:** an `activator` option on `useReorderSortable`, with
   the board unchanged.
2. **Panel states:** as in Architecture decisions (skeleton / empty /
   counter only, no New rows).
3. **Plan location:** committed as `docs/specs/plot-sidebar.plan.md` and
   `plot-sidebar.tasks.md`, the same as the plot plan.
