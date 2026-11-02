# Spec: Sidebar view switcher

> Status: Approved
> Branch: `feat/sidebar-view-switcher`
> Design handoff: `docs/design-handoffs/sidebar-view-switcher/README.md` (prototype `combined-v2.dc.html`, screens `01-view-switcher-open.png` and `04-story-view.png`). Where the prototype and this spec disagree, this spec wins (see §10: no counts, a different Plot icon, links instead of radio items).
> Related: `docs/specs/plot-sidebar.md` (PR #51, merged). It shipped the Plot sidebar panel, filtering, sidebar reordering and the board-header removal that the handoff also covers. **Those parts are out of scope here.**

## 1. Objective

The three-row Tools rail (Story / Characters / Plot) becomes one compact dropdown: a tinted trigger that shows the current view, and a menu that lists the views.

### User story

- As a writer, I see which view I'm in at a glance, and I switch between Story and Plot from one control.

## 2. Repository facts

| Question | Answer from the repo |
| --- | --- |
| Where the rail lives | `features/sidebar/components/tool-list.tsx` (`<nav aria-label="Tools" className="mt-5.5">`), rendered last in `ProjectHeaderView` (`project-header.tsx`). Test: `tool-list.test.tsx`. Story: `packages/ui/stories/tool-list.stories.tsx` (stories live in `packages/ui/stories/`, with a `MemoryRouter` decorator and a `route` parameter). |
| Items | `SIDEBAR_TOOLS` in `sidebar.constants.ts`: `{ label, tool }`. Characters has `tool: null`. |
| How the view is chosen | By route. Story → `projectPath(id)`. Plot → `plotPath(id)`. Plot is active when `useMatch(PLOT_ROUTE)` matches (`AppSidebar` already uses `PLOT_ROUTE`; `ToolList` still hard-codes the pattern). |
| Sidebar body by route | Done. `AppSidebar` renders `PlotSidebarPanel` on Plot and `DraftSection` otherwise. |
| Account menu surface | `sidebar-footer-actions.tsx`: `DropdownMenuContent` with `rounded-xl border-border bg-popover p-1.5 shadow-[0_8px_28px_rgba(26,25,23,0.08)]`. |
| Vendored radio item | `DropdownMenuRadioItem` always renders a circle indicator at `left-2` with `pl-8`. It would collide with the design's leading view icon, and `packages/ui/src/components/ui/` can't be edited. |
| Icons | `@ui/components/icon/icon` registry has `fileText` and `chevronDown`. It has **no** users, Gantt or up-down chevron icon. |
| E2E | No e2e spec references the Tools rail or its links. |

## 3. Scope

| Item | Class |
| --- | --- |
| `ViewSwitcher` dropdown replacing `ToolList` | **In** |
| `SIDEBAR_TOOLS` gains `icon` | **In** |
| Register the `users`, `squareChartGantt` and `chevronsUpDown` icons | **In** |
| Counts in the menu (any view) | **Out** (D2) |
| Plot sidebar panel, filters, reorder, counter, board-header removal | **Done** (`plot-sidebar.md`, PR #51) |
| Characters panel | **Deferred** (§7) |
| Logo, "Manuscript", project title, account menu | **Unchanged** |

## 4. Behaviour

### Trigger

- Placement: the same slot as `ToolList`, the last child of `ProjectHeaderView`, with `mt-5.5`.
- `DropdownMenuTrigger asChild` on a `Button` (`variant="ghost"`): full width, `h-11`, `rounded-[10px]`, `bg-sidebar-accent` (also on hover and while open), `px-3`, `gap-2.5`.
- Content, left to right:
  - the current view's icon (16px, `text-foreground`)
  - the label (`text-[14px] font-medium text-foreground`)
  - `chevronsUpDown` (16px, `text-muted-foreground`, `ml-auto`)
- Accessible name: `View: Story` / `View: Plot`.
- Current view: Plot when `useMatch(PLOT_ROUTE)` matches, otherwise Story.

### Menu

- `DropdownMenuContent`:
  - `align="start"`, `sideOffset={6}`
  - width `var(--radix-dropdown-menu-trigger-width)`
  - the account menu's surface classes (`rounded-xl border-border bg-popover p-1.5` + its shadow). Extract the shared class string to `sidebar.constants.ts`; don't copy it.
- One item per `SIDEBAR_TOOLS` entry, in order: Story, Characters, Plot.
- Item: `h-10`, `rounded-lg`, `px-[9px]`, `gap-2.5`. Content: icon (16px, `text-muted-foreground`), then the label (`text-[14px]`). There is **no count**. Focus uses the `bg-row-hover` tint.
- **Items are links.** Each enabled item is `DropdownMenuItem asChild` wrapping a router `Link` to `projectPath` / `plotPath`, the way the rail navigates today. The current item gets `aria-current="page"` and keeps the `bg-row-hover` tint.
- **Characters:** `disabled`, and it stays in the list (as in the rail today). Its disabled styling matches the account menu's unwired items (`data-[disabled]:opacity-100`, muted text).
- Selecting the current view closes the menu without navigating.
- Keyboard and focus come from Radix:
  - `Enter`/`Space`/`↓` open the menu.
  - The arrow keys move between items and skip Characters.
  - `Esc` closes the menu and returns focus to the trigger.
- With no `projectId` (the `useProjectId()` fallback), every item is disabled, as in the rail today.

## 5. Code

- `sidebar.constants.ts`:
  - `SIDEBAR_TOOLS` entries become `{ label, tool, icon }`, with the icons `fileText`, `users` and `squareChartGantt`.
  - Add the menu surface class, shared with `sidebar-footer-actions.tsx`.
- `packages/ui/src/components/icon/icon.tsx`: register these icons from `lucide-react`, and confirm the export names with context7. This file isn't shadcn-managed.
  - `users` (`UsersIcon`)
  - `squareChartGantt` (`SquareChartGanttIcon`, https://lucide.dev/icons/square-chart-gantt)
  - `chevronsUpDown` (`ChevronsUpDownIcon`)
- `features/sidebar/components/view-switcher.tsx` (+ `.test.tsx`) and `packages/ui/stories/view-switcher.stories.tsx` replace `tool-list.tsx`, `tool-list.test.tsx` and `tool-list.stories.tsx`, which are deleted.
- `project-header.tsx`: `<ToolList />` → `<ViewSwitcher />`.

## 6. Testing

This follows `.claude/rules/testing.md`: changed web UI needs web integration tests and Storybook.

- No API changes.
- No pure logic, so no unit tests.
- No new e2e journey. Switching views isn't covered by e2e today, and the existing specs navigate by URL.

| Layer | Covers |
| --- | --- |
| Web integration | **Trigger:** reads `View: Story` on `/project/:id` and `View: Plot` on `/project/:id/plot`. **Menu:** lists three items with no counts, and Characters is disabled. **Navigation:** selecting Plot goes to the plot route, and selecting Story goes back. The current item has `aria-current="page"`. **No project:** every item is disabled. **Keyboard:** `Enter` opens, the arrow keys move (skipping Characters), and `Esc` closes and returns focus to the trigger. |
| Storybook | `ViewSwitcher` (same `MemoryRouter` decorator as `tool-list.stories.tsx`): Story, Plot, menu open, no project, dark. |
| Regression | `tool-list.test.tsx` and `tool-list.stories.tsx` are deleted with the component. The new test covers the same navigation and the Characters-disabled case. |

## 7. Deferred: Characters

The approved Characters panel design (`characters-panel.dc.html`, `screenshots/05-characters-deferred.png`) is for the future characters spec:

- A search field filtering live, case- and diacritic-insensitive.
- A `CHARACTERS` header with a filtered count and a `+`.
- 40px rows with an initials avatar.

When the characters domain exists, the Characters item gets a route and the panel. Until then it stays disabled.

## 8. Commands

```bash
pnpm dev:web
pnpm test:web view-switcher project-header app-sidebar
pnpm storybook
pnpm lint
```

`pnpm typecheck` runs in the pre-push hook.

## 9. Boundaries and success criteria

**Always:**

- Navigate by route only.
- Use `@ui` components and the `Icon` registry.
- Ship the stories and tests in §6.

**Ask first:**

- Adding a new dependency.
- Changing the top-left header or the account menu beyond extracting the shared surface class.
- Enabling Characters.
- Adding counts.

**Never:**

- Edit `packages/ui/src/components/ui/`.
- Store the current view in Jotai or `localStorage`. The route is the state.

**Success criteria:**

- [ ] The Tools rail is replaced by the view switcher, and it matches screens 01 and 04, except: no counts, and the `squareChartGantt` icon for Plot.
- [ ] Story and Plot navigate by route. The trigger and the menu reflect the current view, and Characters is disabled.
- [ ] The full keyboard path works: open, move, select, and `Esc` back to the trigger.
- [ ] `tool-list.tsx`, its test and its story are gone. The new tests and stories exist and pass. Lint is clean, and the pre-push typecheck passes.

## 10. Decisions

- **D1. Item semantics.** Items are links (`DropdownMenuItem asChild` + `Link`, `aria-current="page"`), not `DropdownMenuRadioItem`.
  - Why: views are routes, and the vendored radio item's built-in circle indicator collides with the leading icon.
  - Cost: no `menuitemradio` / `aria-checked` semantics.
- **D2. Counts.** No view shows a count in the menu. The only card count is the Plot sidebar's pinned counter (the plotline rows' card counts were removed).
- **D3. Plot icon.** `squareChartGantt` (https://lucide.dev/icons/square-chart-gantt) replaces the prototype's sliders icon.
