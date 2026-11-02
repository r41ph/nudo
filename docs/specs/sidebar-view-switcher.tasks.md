# Tasks: Sidebar view switcher

> Plan: `docs/specs/sidebar-view-switcher.plan.md` · Spec: `docs/specs/sidebar-view-switcher.md`
> Run focused tests with `pnpm test:web <filter>`. Typecheck runs in pre-push.
> Query context7 before using Radix DropdownMenu, React Router, lucide-react, Testing Library or Storybook APIs.

## Task 1: Icons, `SIDEBAR_TOOLS.icon` and the shared menu surface

**Description:** Lay the groundwork without changing anything visible.

**Acceptance criteria:**
- [ ] `users`, `squareChartGantt` and `chevronsUpDown` are registered in `packages/ui/src/components/icon/icon.tsx`. The `lucide-react` export names are confirmed with context7 and present in the installed version.
- [ ] `SIDEBAR_TOOLS` entries are `{ label, tool, icon }`: Story `fileText`, Characters `users`, Plot `squareChartGantt`. `ToolList` still compiles and ignores `icon`.
- [ ] The account menu's content class moves to a constant in `sidebar.constants.ts`, and `sidebar-footer-actions.tsx` uses it. The rendered output is unchanged.

**Verification:**
- [ ] `pnpm test:web sidebar-footer-actions tool-list`
- [ ] `pnpm lint`

**Dependencies:** None
**Files:** `packages/ui/src/components/icon/icon.tsx`, `features/sidebar/sidebar.constants.ts`, `features/sidebar/components/sidebar-footer-actions.tsx`
**Scope:** S

## Task 2: `ViewSwitcher` replaces `ToolList`

**Description:** Build the dropdown test-first, swap it into `ProjectHeaderView`, and delete `ToolList`, its test and its story.

**Acceptance criteria:**
- [ ] `view-switcher.test.tsx` is written first and fails, covering spec §6:
  - The trigger reads `View: Story` on `/project/:id/document/:doc` and `View: Plot` on `/project/:id/plot`.
  - The menu lists Story, Characters and Plot with no counts, and Characters is disabled.
  - Selecting Plot navigates to the plot route, and selecting Story navigates back. The current item has `aria-current="page"`.
  - Selecting the current view closes the menu and the route doesn't change.
  - With no project, every item is disabled.
  - Keyboard: `Enter` opens, the arrow keys move (skipping Characters), and `Esc` closes and returns focus to the trigger.
- [ ] `view-switcher.tsx` matches spec §4: `Button` trigger (`h-11 rounded-[10px] bg-sidebar-accent px-3 gap-2.5`, icon · label · `chevronsUpDown`); menu at the trigger's width with `sideOffset={6}` and the shared surface; items `h-10 rounded-lg px-[9px] gap-2.5` with the icon in `text-muted-foreground`; `bg-row-hover` on focus and on the current item. It uses `PLOT_ROUTE`, not a hard-coded pattern.
- [ ] `ProjectHeaderView` renders `<ViewSwitcher />` in place of `<ToolList />`.
- [ ] `tool-list.tsx`, `tool-list.test.tsx` and `packages/ui/stories/tool-list.stories.tsx` are deleted, and nothing references them.
- [ ] `packages/ui/stories/view-switcher.stories.tsx` (same `MemoryRouter` decorator and `route` parameter as the old story): Story, Plot, MenuOpen (`play` opens it), NoProject, Dark.
- [ ] `project-header` and `app-sidebar` tests still pass (update any query that relied on the "Tools" nav or the rail links).

**Verification:**
- [ ] `pnpm test:web view-switcher project-header app-sidebar`
- [ ] `pnpm lint`
- [ ] In Storybook, light and dark, compare against `01-view-switcher-open.png` and `04-story-view.png` (no counts, Gantt icon).
- [ ] In `pnpm dev:web`, switch Story ↔ Plot with mouse and keyboard.

**Dependencies:** Task 1
**Files:** `features/sidebar/components/view-switcher.tsx`, `view-switcher.test.tsx`, `project-header.tsx`, `tool-list.tsx` (deleted), `tool-list.test.tsx` (deleted), `packages/ui/stories/view-switcher.stories.tsx`, `packages/ui/stories/tool-list.stories.tsx` (deleted)
**Scope:** M

## Task 3: Docs and PR

**Description:** Finish the feature workflow.

**Acceptance criteria:**
- [ ] `CLAUDE.md` and `.claude/rules/*` are checked. No convention changed, so it's expected that nothing needs updating.
- [ ] The branch is pushed and the PR is opened with `Spec: docs/specs/sidebar-view-switcher.md` and `Design handoff: docs/design-handoffs/sidebar-view-switcher/README.md`.
- [ ] The spec's status line records the PR (`> Status: In review (PR #NN — <url>)`), committed into the same PR.

**Verification:**
- [ ] The pre-push hook (commitlint and typecheck) passes.
- [ ] The PR and the spec link to each other.

**Dependencies:** Task 2
**Files:** `docs/specs/sidebar-view-switcher.md`
**Scope:** XS
