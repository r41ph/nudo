# Handoff: Sidebar view switcher and Plot sidebar (—nudo.)

> Spec: `docs/specs/sidebar-view-switcher.md` — **behaviour is defined there**. This bundle is the visual reference and the "what changes vs. current code" contract.
> Source: Claude Design canvas "Nudo sidebar explorations", artboard **Combined v2 · clickable** (direction chosen: dropdown 3, "tinted bar + counts"; Plot filter; Characters search + list).

## Overview

The sidebar shows only what the current view needs:

1. **View switcher.** A tinted dropdown replaces the three-row Tools rail (Story / Characters / Plot).
2. **Plot sidebar.** On the Plot route, the sidebar body shows Plotlines and Beats lists in place of the Draft outline. Each row has a show/hide checkbox and a drag handle. Each list scrolls on its own, and a counter is pinned at the bottom.
3. **Board header removed.** The board loses its header ("Plot", summary, Add beat, Add plotline). Those move into the sidebar.

## Explicitly out of scope

- **Top-left header:** logo, "Manuscript" label and project title. Unchanged.
- **Account menu**, including the Projects submenu. Unchanged. There is no project switcher on the title.
- **Characters panel.** The design is approved, but it waits for the characters domain (see `screenshots/05-characters-deferred.png` and spec §9).
- The board's own drag, `⋯` menus and card editor.

## About the design files

`combined-v2.dc.html` is a **clickable HTML prototype** of the intended look. It is not production code to copy. Build it with the existing app's patterns and components (`@ui/components/ui/*`, the `Icon` registry, the plot feature's dnd-kit helpers).

To view it, serve the folder (for example `npx serve docs/design-handoffs/sidebar-view-switcher`) and open the file. `support.js` is the bundled runtime, and only fonts load from the network. Click the dropdown to switch views, and tick or untick rows to filter the board.

**Fidelity: medium–high.**

- Layout, hierarchy, row sizes and spacing are final.
- Colours are shown as hex in the prototype. Map them to the existing tokens (table below), and don't introduce new values.
- The sidebar stays at `SIDEBAR_WIDTH` (295px). The prototype uses 300px.

## Prototype vs spec — where they differ, the spec wins

| Prototype | Build this instead | Why |
| --- | --- | --- |
| The Plot sidebar scrolls as **one** block | Each list (Plotlines, Beats) scrolls on its own. Section headers, the counter and the account button stay fixed (spec §6.1). | Requested after the mockup |
| No drag handles on sidebar rows | A `ReorderHandle` grip on each row, revealed on hover/focus. It is the only place a drag starts (spec §6.3, §6.5). | Requested after the mockup |
| Characters is selectable in the switcher | Characters stays **disabled** until the characters domain exists | No characters table, route or API yet |
| Story count reads "1 chapter" | `{n} documents`, or no count (spec open question 1) | "Chapter" isn't a domain concept in the outline |
| The counter's card total stays at 33 while filtering | Visible cards only (spec §6.6, open question 2) | Prototype only had 13 real cards |
| `[Plotline 4]`, `[Beat 6]` and similar | Real data | Placeholders where the source screenshot was cut off |

## Scope — what changes vs. current code

| Area | Current code | Target |
| --- | --- | --- |
| Tools rail | `sidebar/components/tool-list.tsx`: three `SidebarMenuButton` rows, Characters disabled | `view-switcher.tsx`: one `DropdownMenu` trigger and a radio list with an icon and muted count per view. Navigates by route as today. |
| `SIDEBAR_TOOLS` | `{ label, tool }` | Adds `icon` |
| Sidebar body | `AppSidebar` always renders `DraftSection` in a single `overflow-auto` `SidebarContent` | Story route: `DraftSection` (unchanged). Plot route: `PlotSidebarPanel`, where only the two lists scroll. |
| Plot header | `plot/components/board/plot-header.tsx` | **Deleted**. The refresh-failed and view-only notices stay on the board. |
| Board rows/columns | All plotlines and beats are rendered | Only visible ones (`visiblePlot()`). Move menus still use the full order. |
| Filter state | None | `plot/state/plot-view.store.ts`: `atomWithStorage` under `nudo:plot-view:<projectId>` |
| Sidebar reordering | None | A `DndContext` in the panel, reusing `reorderedIds`, `orderAnnouncements` (export it), `PLOT_DRAG_KEYS`, `ReorderHandle`, `reorderPlotlines` / `reorderBeats` |
| Icons | No up-down chevron, search, characters or plot icon | Register them in `packages/ui/src/components/icon/icon.tsx` |
| Checkbox | Check whether it's vendored | `npx shadcn@latest add checkbox` if missing |

## Screens

| File | Shows |
| --- | --- |
| `screenshots/00-current-sidebar.png` | Before: logo, Manuscript, title, the three-row rail, Draft |
| `screenshots/01-view-switcher-open.png` | Tinted trigger (icon · label · up-down chevron) and the open menu with counts |
| `screenshots/02-plot-view.png` | Plot route: sidebar with Plotlines, Beats and the counter; board without a header |
| `screenshots/03-plot-filtered.png` | "The Ashbys" and "Inciting incident" hidden: unticked rows are muted, the row and column are gone from the board, and the counter reads "4 of 5 plotlines · 7 of 8 beats" |
| `screenshots/04-story-view.png` | Story route: switcher reads Story, and the Draft outline is unchanged |
| `screenshots/05-characters-deferred.png` | Characters panel (search, count, `+`, list). **Not in this PR.** |

## Visual values

### View switcher

| | Value |
| --- | --- |
| Position | Below the title, where `ToolList` is now (`mt-5.5`) |
| Trigger | Full width, 44px high, radius 10px, background `bg-sidebar-accent` (prototype `#F0ECE6`), 12px horizontal padding, 10px gap |
| Trigger content | 16px view icon · label 14–15px / 500 `text-foreground` · up-down chevron 16px `text-muted-foreground`, right-aligned |
| Menu | Trigger width, 6px below it, radius 12px, 1px `border-border`, `bg-popover`, the account menu's shadow, 6px padding |
| Menu item | 40px, radius 8px, 16px icon `text-muted-foreground` · label 14px · count 12px `text-muted-foreground`, right-aligned. The current item has a `bg-row-hover` tint. |

### Plot sidebar

| | Value |
| --- | --- |
| Section label | `text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`, 32px row |
| Show all | Text button, 12px, `text-muted-foreground`, right-aligned; disabled when nothing is hidden |
| Row | 34px, radius 8px, 10px gap, 12px horizontal padding |
| Handle | 16px grip in a reserved slot left of the checkbox; opacity 0 until row hover / `:focus-within` / `pointer-coarse` |
| Checkbox | 16px, radius 4px, 1.5px border. Plotline: its `bg-plot-*` colour (filled with a white tick when visible, outline only when hidden). Beat: `bg-prose`. |
| Name | 14px; `text-foreground` when visible, `text-muted-foreground` when hidden; truncates |
| Card count | 12px `text-muted-foreground`, right-aligned (plotlines only) |
| New row | Same row metrics: `plus` icon + "New plotline" / "New beat" in `text-muted-foreground`, last item inside the scrolling list |
| Section gap | 14px between Plotlines and Beats |
| Counter | 12px `text-muted-foreground`, 12px padding, may wrap; sits directly above the account button |

### Board

| | Value |
| --- | --- |
| Header | Removed. The grid starts at the beat header row, top padding 40px (`py-10` area, the same left padding as today). |

### Token mapping (prototype hex → existing token)

| Prototype | Token |
| --- | --- |
| `#FCFBF9` ground | `--background` / sidebar background |
| `#F0ECE6` selected / trigger | `--sidebar-accent` |
| `#F4F1EC` menu current | `--row-hover` |
| `#ECE8E2`, `#E6E1D9` borders | `--border` |
| `#1F1E1C` text | `--foreground` |
| `#6B6862` muted | `--muted-foreground` |
| Plotline colours | `--plot-*` via `PLOTLINE_COLOR_DOT_CLASS` |

## Acceptance

See the spec's success criteria (§16). Visually, the result matches screens 01–04, including the two adjustments listed in "Prototype vs spec" (independent scroll and drag handles).

## Files in this bundle

- `README.md`: this file, the contract.
- `combined-v2.dc.html`: clickable prototype (Story / Plot, filters).
- `characters-panel.dc.html`: deferred Characters panel, for the characters spec.
- `support.js`: prototype runtime. Don't edit it.
- `screenshots/`: captured from the prototype at 1440×900 @2x, with the sidebar-only screens at 300×760 @2x.
