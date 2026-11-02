# Implementation Plan: Sidebar view switcher

> Spec: `docs/specs/sidebar-view-switcher.md` (Approved)
> Visual reference: `docs/design-handoffs/sidebar-view-switcher/` (screens 01, 04)
> Branch / worktree: `feat/sidebar-view-switcher` at `../sidebar-view-switcher`
> Tasks: `docs/specs/sidebar-view-switcher.tasks.md`

## Overview

`ViewSwitcher` replaces `ToolList` in `ProjectHeaderView`. It is a tinted
`DropdownMenu` trigger that shows the current view, and a menu of link items
(Story, Characters disabled, Plot). The work is web-only: no API, no new
dependencies, no new tokens, and no counts.

This ships as one small PR in three tasks. Every task leaves the sidebar working.

## Dependency graph

```
T1 icons + SIDEBAR_TOOLS.icon + shared menu surface class
        │
T2 ViewSwitcher (test-first) + story, swapped into ProjectHeaderView,
   ToolList + its test + its story deleted
        │
T3 docs + PR
```

## Architecture decisions

- **The route is the state.** The current view is `useMatch(PLOT_ROUTE) ? 'plot' : 'story'`, the same as `AppSidebar`. Nothing is stored in Jotai or `localStorage`.
- **Items are links** (spec D1): `DropdownMenuItem asChild` + `Link`, with `aria-current="page"` on the current one. Radix's `onSelect` closes the menu, and the `Link` navigates. Selecting the current view navigates to the same URL, which is a no-op for the router. The test checks that it neither changes the route nor reloads the page.
- **One component, no container/view split.** With no counts there's no data to inject. Stories use the existing `MemoryRouter` decorator from `tool-list.stories.tsx`, with a `route` parameter.
- **Shared surface.** The account menu's content class string moves to `sidebar.constants.ts` (for example `SIDEBAR_MENU_SURFACE`), and both menus use it. This is the only change to `sidebar-footer-actions.tsx`, as the spec allows.
- **Width.** The menu content uses `w-[var(--radix-dropdown-menu-trigger-width)]`. Confirm the CSS variable name with context7 (Radix DropdownMenu).
- **Icons.** `users`, `squareChartGantt` and `chevronsUpDown` are registered in `packages/ui/src/components/icon/icon.tsx`. Confirm the `lucide-react` export names with context7, and check that `SquareChartGanttIcon` exists in the installed version.

## Risks

| Risk | Mitigation |
| --- | --- |
| `SquareChartGantt` isn't in the installed `lucide-react` | Check `node_modules` in T1. If it's missing, stop and ask; don't bump the dependency without asking. |
| `Button` ghost hover styles override the `bg-sidebar-accent` tint | Set `hover:bg-sidebar-accent` and `data-[state=open]:bg-sidebar-accent` explicitly, and check in Storybook in both themes. |
| `DropdownMenuItem asChild` + `Link` loses the disabled behaviour for Characters | Characters (and every item when there's no project) renders a plain disabled `DropdownMenuItem`, not a link, as `ToolList` does today. |
| jsdom and Radix pointer events in tests | Follow the existing `sidebar-footer-actions.test.tsx` pattern for opening menus with `userEvent`. |

## Verification checkpoints

- After T1: `pnpm lint`. Icons render in the existing `Icon` story or usage. Nothing visible changes yet.
- After T2: `pnpm test:web view-switcher project-header app-sidebar`. Storybook check against screens 01 and 04 in light and dark. Manual check in `pnpm dev:web`: switch Story ↔ Plot with mouse and keyboard.
- After T3: the PR is open, and the spec links to it.
