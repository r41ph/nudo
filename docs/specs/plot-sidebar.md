# Spec: Plot sidebar

> Status: Approved
> Branch: `feat/plot-sidebar`
> Depends on: `docs/specs/plot.md` (PRs 1–2 merged as #45, #49)
> Design handoff: `docs/design-handoffs/plot-sidebar/README.md`
> Related: `docs/specs/sidebar-view-switcher.md` (the control above this panel). The two are independent and either can ship first.

## 1. Objective

When the Plot view is open, the sidebar shows Plot controls instead of the Draft outline. The board header goes, so the board gets the whole main area.

The panel has:

- a **Plotlines** list and a **Beats** list. Each row has a show/hide checkbox and a drag handle. Each list scrolls on its own under a fixed header, and ends with a "New plotline" / "New beat" row.
- a **counter**, pinned above the account button.

### User stories

- As a writer planning on the board, I hide the plotlines and beats I'm not working on, so I can focus.
- As a writer, I reorder plotlines and beats from a list without scrolling the board, and the board follows.
- As a writer with many plotlines and beats, I scroll each list on its own and always see both headers and the totals.

## 2. Repository facts

| Question | Answer from the repo |
| --- | --- |
| Sidebar body today | `AppSidebar` always renders `DraftSection` inside `SidebarContent` (`flex min-h-0 flex-1 flex-col overflow-auto` — one scroll container), **including on the Plot route** |
| Plot route | `/project/:projectId/plot` (`plotPath`); `useMatch('/project/:projectId/plot')` |
| Sidebar width / collapse | `SIDEBAR_WIDTH = '295px'`. Docked at ≥1280px, otherwise the `SidePanel` overlay (`workspace-layout.tsx`). |
| Board header | `plot/components/board/plot-header.tsx`: "Plot", `countLabel` summary, and **Add beat** / **Add plotline** when `editable` |
| Board DnD | One `DndContext` in `plot-board.tsx`, using `@dnd-kit/core` + `@dnd-kit/sortable`. `PointerSensor` (distance 6) and `KeyboardSensor` (`sortableKeyboardCoordinates`, `PLOT_DRAG_KEYS`). Helpers in `lib/plot-dnd.ts`: `reorderedIds`, `acceptsDrop`, and `orderAnnouncements` (not exported). Handle: `ReorderHandle` / `useReorderSortable` (`reorder-handle.tsx`). |
| Reorder / add | `usePlotMutations(projectId)`: `reorderPlotlines(ids)`, `reorderBeats(ids)` (optimistic on `['plot', projectId]`, rollback + `toast.error(PLOT_SAVE_ERROR)`), `addPlotline()`, `addBeat()` |
| Plot data | `usePlot(projectId)` → `{ plotlines, beats, cards }` |
| Edit gate | `usePlotEditable()`: true at ≥1024px (`PLOT_EDIT_MIN_WIDTH`) |
| Plotline colours | `PLOTLINE_COLOR_DOT_CLASS[color]` → `bg-plot-*` |
| View preferences | `plot.md` §12 reserves `localStorage` `nudo:plot-view:<projectId>` (try/catch, defaults on failure); nothing implements it yet |
| Board extras | **+ Plotline** under the last row; refresh-failed alert; view-only notice |

## 3. Scope

| Item | Class |
| --- | --- |
| Sidebar body by route: Plot → `PlotSidebarPanel`, else `DraftSection` | **In** |
| Plotlines / Beats sections: fixed header + Show all + scrolling list + New row | **In** |
| Show/hide (filter) per plotline and beat, persisted per project | **In** |
| Drag and keyboard reordering from the sidebar, shared order with the board | **In** |
| Pinned counter | **In** |
| Remove `PlotHeader` from the board | **In** |
| The view switcher above the panel | **Out**: `sidebar-view-switcher.md` |
| Board drag, `⋯` menus, card editor | **Unchanged** |
| Top-left header, account menu | **Unchanged** |

## 4. Sidebar body by route

- `AppSidebar` renders `PlotSidebarPanel` on the Plot route, and `DraftSection` everywhere else.
- `PlotSidebarPanel` is exported from `features/plot`. This follows the existing pattern of `sidebar-footer-actions.tsx` importing `ProjectsSubmenu` from `features/project`.
- On the Plot route the body must **not** be one scroll container. Render the panel with `SidebarContent className="overflow-hidden"` (or outside it). Don't edit `packages/ui/src/components/ui/sidebar.tsx`.

## 5. Panel layout and scrolling (required)

```
ProjectHeaderView                                         fixed
PlotSidebarPanel  (flex-1 min-h-0 flex-col gap-3.5)
  ├─ Plotlines section  (flex-col, flex 0 1 auto, min-h header + 3 rows)
  │    ├─ header: PLOTLINES · Show all                    fixed
  │    └─ list (min-h-0 overflow-y-auto)                  scrolls: rows + New plotline
  ├─ Beats section  (same)
  │    ├─ header: BEATS · Show all                        fixed
  │    └─ list (min-h-0 overflow-y-auto)                  scrolls: rows + New beat
  └─ counter (shrink-0)                                   fixed
SidebarFooterActions                                      fixed
```

- **Independent scrolling:** each list is its own scroll container. Scrolling one list never moves the other list, either section header, the counter or the account button.
- **Height split:** each section is at most its content height. When both don't fit, both shrink. Each keeps at least `header + 3 rows` visible: `min-h-[calc(2rem+3*2.125rem)]`.
- The counter and account button stay visible at any viewport height ≥ 600px.

## 6. Section header

- Label: `text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`, 32px row (matching "Manuscript" and "Draft").
- **Show all:** ghost `Button size="sm"`, `text-xs text-muted-foreground`, aligned right. Disabled when nothing in that section is hidden.

## 7. Rows

Each row is 34px, `rounded-lg`, and contains, in order:

1. **Drag handle.** `ReorderHandle`, in a reserved 20px slot.
   - Hidden by opacity until row hover, `:focus-within` or `pointer-coarse`. It stays in the tab order, using the same pattern as the board's `⋯` trigger.
   - Rendered only when `editable`. Drag starts **only** here, never from the row body.
2. **Checkbox.** shadcn `Checkbox`, 16px, radius 4px. It isn't vendored yet: add it with `npx shadcn@latest add checkbox`. It uses the already-installed `radix-ui` package, so no new dependency.
   - Plotline: filled with its `bg-plot-*` colour and a white tick when visible; outline only, same colour, when hidden.
   - Beat: neutral `bg-prose` / border `prose`.
   - Accessible name: "Show <name>".
3. **Name.** 14px, truncates. `text-foreground` when visible, `text-muted-foreground` when hidden.
4. **Card count** (plotlines only). `text-xs text-muted-foreground`, aligned right; the same number as `PlotlineLabel`.

The checkbox and name sit in one `Label`, so clicking the row toggles visibility.

**New row:** the last item inside each scrolling list. A ghost row with a `plus` icon and "New plotline" / "New beat" (`text-muted-foreground`), aligned with the names.

- It calls `addPlotline()` / `addBeat()`. The new item is visible and scrolled into view within its list.
- Not rendered when `!editable`.

## 8. Filtering

- **Effect on the board:** a hidden plotline's row (label + cells) and a hidden beat's column (header + cells) are not rendered. Hidden items stay in their sidebar list, in order.
- **Everything hidden:** if all plotlines or all beats are hidden, the board shows "Everything is hidden." with a **Show all** button that clears both filters.
  - This state needs at least one item to be actually hidden. A plot with no plotlines or no beats keeps today's `PlotEmpty` / empty-board behaviour.
- **State:** `features/plot/state/plot-view.store.ts`, a Jotai atom per project holding `{ hiddenPlotlineIds: string[]; hiddenBeatIds: string[] }`.
  - Built per project inside a hook (memoised on `projectId`), not with `atomFamily`. `atomFamily` is deprecated in `jotai/utils` and moved to the separate `jotai-family` package, which would be a new dependency.
  - Persisted with `atomWithStorage` under `nudo:plot-view:<projectId>`. The later View-menu settings in `plot.md` §12 join the same object.
  - Storage access goes through a custom storage that wraps reads and writes in try/catch; the default is "nothing hidden".
  - Unknown ids are ignored when filtering and pruned on the next write.
- **Pure helper:** `visiblePlot(plot, view)` in `lib/plot.utils.ts` returns the visible plotlines, beats and cards. Both the board and the counter use it.
- **Order:** reorder actions (sidebar drag, board drag, Move up/down/left/right) operate on the **full** id list. Hidden items keep their positions, and `isFirst` / `isLast` on the board menus use the full order.
  - So a Move whose neighbour is hidden swaps with that hidden item, and the board looks unchanged. This is accepted: the sidebar shows the change.
- **New items** are visible.

## 9. Reordering from the sidebar

- **Context:** the panel has its own `DndContext`, because the sidebar and board are separate trees and only one drag runs at a time. It holds one `SortableContext` per section, using `verticalListSortingStrategy`.
- **Sensors:** the same as the board, `PointerSensor` (`distance: 6`) and `KeyboardSensor` (`sortableKeyboardCoordinates`, `PLOT_DRAG_KEYS`).
- **Accessibility:** `PLOT_DRAG_INSTRUCTIONS` as the screen-reader instructions. Announcements come from `orderAnnouncements`, which gets exported from `plot-dnd.ts` (don't copy it).
- **Drop:** `reorderedIds(fullIds, active.id, over.id)` → `reorderPlotlines` / `reorderBeats`. No new mutation and no API change.
- **Boundaries:** drops stay within their own section. Hidden items can be dragged and keep their hidden state.
- **Auto-scroll:** dnd-kit's built-in auto-scroll scrolls the section's own list near its edges (confirm the default via context7). No `@dnd-kit/modifiers` (not installed — ask first).
- **Visuals:** a `DragOverlay` row (colour dot + name) like the board's, the source row faded, and a 2px accent drop line.
- **Sync:** both surfaces render from `['plot', projectId]`, so the board and sidebar orders always match. A failure rolls back both with the existing toast.

## 10. Counter

- **Text:** `{visible} of {total} plotlines · {visible} of {total} beats · {visibleCards} cards`, using `countLabel`.
  - With nothing hidden it reads like today's summary: "5 plotlines · 8 beats · 33 cards".
  - `visibleCards` counts the cards in visible plotline × visible beat cells.
- **Styling:** `text-xs text-muted-foreground`, `px-3 py-2.5`, may wrap. It sits in a `role="status"` region, so changes are announced.
- **Placement:** the last child of `PlotSidebarPanel`, directly above `SidebarFooterActions`. It is not part of the footer component.

## 11. Board changes

- **Header:** delete `PlotHeader` and `plot-header.tsx`. The refresh-failed alert and view-only notice stay at the top of the board area.
- **Rows and columns:** the board renders `visiblePlot(...)`, and `gridTemplateColumns` uses the visible beat count.
- **+ Plotline** under the last row stays (see open questions).

## 12. View-only (<1024px)

The sidebar collapses to the overlay below 1280px, where it renders the same `PlotSidebarPanel`. Editing stops below 1024px. When `!editable`:

- no drag handles and no New rows;
- filtering and Show all still work, because they are presentation, not plot data.

## 13. Amendments to `plot.md` (apply when this ships)

- §7.1: the header (title, summary, Add beat, Add plotline) is removed. The summary and add actions now live in the Plot sidebar.
- §12: `nudo:plot-view:<projectId>` also holds `hiddenPlotlineIds` / `hiddenBeatIds`.
- §12–13: the planned View menu and Board / Overview control need a home other than the header (deferred, see §21.3).

## 14. Tech stack

No new dependencies.

- React 19, React Router 7, TanStack Query 5, Jotai 2 (`atomWithStorage`).
- `@dnd-kit/core` 6 / `@dnd-kit/sortable` 10, Tailwind v4, shadcn/ui, `lucide-react` through the `Icon` registry.
- Tests: Vitest, Testing Library, MSW and Playwright.
- Query context7 before using any of these APIs.

## 15. Commands

```bash
pnpm dev:web
pnpm test:web plot-sidebar plot-filter plot-view plot.utils plot-dnd plot-board app-sidebar
pnpm storybook
pnpm test:e2e
pnpm lint
```

`pnpm typecheck` runs in the pre-push hook.

## 16. Project structure

```
apps/web/src/features/sidebar/components/app-sidebar.tsx   ← body by route
apps/web/src/features/plot/
├── state/plot-view.store.ts                               ← new: hidden ids per project
├── lib/plot.utils.ts (+ .test.ts)                         ← visiblePlot(), counter maths
├── lib/plot-dnd.ts (+ .test.ts)                           ← export orderAnnouncements
├── components/board/plot-board.tsx                        ← no PlotHeader; visible rows/columns; "everything hidden" state
├── components/board/plot-header.tsx                       ← deleted
└── components/sidebar/
    ├── plot-sidebar-panel.tsx (+ .test.tsx, .stories.tsx)
    ├── plot-filter-section.tsx (+ .stories.tsx)           ← header + scrolling sortable list + New row
    ├── plot-filter-row.tsx (+ .stories.tsx)               ← handle · checkbox · name · count
    └── plot-counter.tsx
e2e/tests/plot.spec.ts, reorder.spec.ts                    ← extend
```

## 17. Code style

Follow the existing plot code: kebab-case files, path aliases, `@ui/components/ui/*` first, no raw `<button>`/`<input>`/`<label>`, and comments for *why* only.

This is the layout contract:

```tsx
export function PlotSidebarPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5">
      <PlotFilterSection kind="plotline" />
      <PlotFilterSection kind="beat" />
      <PlotCounter />
    </div>
  );
}

// Each section owns its scroll so the other list, both headers and the
// counter stay put while one list scrolls.
function PlotFilterSection({ kind }: { kind: 'plotline' | 'beat' }) {
  return (
    <section className="flex min-h-[calc(2rem+3*2.125rem)] shrink flex-col">
      <FilterSectionHeader kind={kind} />
      <ul className="min-h-0 overflow-y-auto">{/* sortable rows + New row */}</ul>
    </section>
  );
}
```

## 18. Testing

Per `.claude/rules/testing.md`: new web feature → web integration (MSW) + unit for pure helpers; new/changed UI → Storybook; cross-cutting journey → extend e2e. No API changes, so no API tests.

| Layer | Covers |
| --- | --- |
| Unit | `visiblePlot` (hidden plotlines/beats, unknown ids, all hidden); counter maths; `plot-view` store read/write and fallback when storage throws; exported `orderAnnouncements` |
| Web integration | Plot route shows the panel, other routes show Draft; toggling a row hides/shows the board row or column; Show all restores and is disabled when nothing is hidden; New plotline / New beat add a visible item; keyboard reorder in the sidebar reorders the board and announces; failure rolls back with a toast; view-only shows no handles or New rows but filtering works; filter persists across remount; board has no header; "everything hidden" state |
| Storybook | `PlotFilterRow` (visible, hidden, long name, dragging, view-only); `PlotFilterSection` (few, overflowing, all hidden); `PlotSidebarPanel` (default, filtered, dense); `PlotBoard` "everything hidden" |
| E2E | `plot.spec.ts`: hide a plotline and a beat → board updates → reload → still hidden. `reorder.spec.ts` (`fixtures/dnd.ts`): drag a plotline in the sidebar → board order matches after reload. Independent scroll: with 20 plotlines and 20 beats, scrolling the plotlines list leaves the beats list `scrollTop`, both headers and the counter's bounding box unchanged. |
| Accessibility | Keyboard-only filter and reorder; checkbox names include the item name; counter is a status region; colour never the only cue |

Don't write jsdom tests for hover-only visibility (testing rule). Scrolling is covered by e2e.

## 19. Boundaries

- **Always:** reuse `usePlotMutations`, the `plot-dnd` helpers and `ReorderHandle`; keep one order source (`['plot', projectId]`); compute filtering in a pure util; ship tests and stories.
- **Ask first:** any new dependency (including `@dnd-kit/modifiers`); storing filter state on the server; changing the board's own drag; removing **+ Plotline** from the board.
- **Never:**
  - make the Plot sidebar one scroll container;
  - start a drag from the row body;
  - duplicate reorder logic or announcements;
  - edit `packages/ui/src/components/ui/`;
  - put filter state in TanStack Query or plot data in Jotai (`state.md`);
  - skip or delete tests to go green.

## 20. Success criteria

- [x] The Plot route shows the Plot panel in the sidebar; other routes show Draft, unchanged.
- [x] The board has no header. New plotline / New beat in the sidebar create items as Add plotline / Add beat did.
- [x] Checkboxes hide/show board rows and columns, Show all restores them, and the state survives a reload, per project.
- [x] Plotlines and beats reorder from the sidebar by pointer and keyboard. Board and sidebar orders always match and persist, and failures roll back with the existing toast.
- [x] The Plotlines and Beats lists scroll independently. Section headers, the counter and the account button never scroll.
- [x] The counter is correct for every filter combination.
- [x] Below 1024px there are no handles or New rows, and filters still work.
- [x] Tests and stories in §18 exist and pass; lint is clean and the pre-push typecheck passes.

## 21. Resolved questions

1. **Counter cards:** count visible cards only, so the counter matches the board.
2. **+ Plotline under the board:** keep it. Removing it stays an "ask first" item.
3. **Future header controls** (`plot.md` View menu, Board / Overview): deferred. Not needed to ship this; decide when those controls are specced.
4. **Height split:** content-based shrink with a 3-row minimum, not a fixed 50/50.
