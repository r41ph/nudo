# Handoff: Plot sidebar (—nudo.)

> Spec: `docs/specs/plot-sidebar.md` (behaviour is defined there)
> Source: Claude Design canvas "Nudo sidebar explorations" → Plot 3 "Plotline filter", extended to beats; Combined v2

## Overview

On the Plot route the sidebar body shows Plotlines and Beats in place of the Draft outline:

- each row has a drag handle and a show/hide checkbox;
- each list scrolls on its own under a fixed header and ends with a New row;
- a counter is pinned above the account button.

The board loses its header ("Plot", summary, Add beat, Add plotline).

## Explicitly out of scope

- The view switcher above the panel. It appears in the prototype for context only; its design is `docs/design-handoffs/sidebar-view-switcher/`.
- Top-left header and account menu. Unchanged.
- Board drag, `⋯` menus and card editor. Unchanged.

## About the design files

`plot-sidebar.dc.html` is a **clickable HTML prototype**, not code to copy. Build it with the existing plot code: `ReorderHandle`, the `plot-dnd` helpers, `usePlotMutations`, and the shadcn `Checkbox` / `Button`.

To view it, serve this folder (e.g. `npx serve docs/design-handoffs/plot-sidebar`) and open the file. `support.js` is the bundled runtime; only fonts load from the network.

In the prototype:

- tick or untick rows to filter the board;
- hover a row to reveal its handle;
- the handle is visual only, because dragging isn't simulated.

**Fidelity: high** for layout, sizes and hierarchy. Prototype colours are hex; map them to the tokens below. The sidebar stays 295px (`SIDEBAR_WIDTH`); the prototype is 300px.

## Scope — what changes vs. current code

| Area | Current code | Target |
| --- | --- | --- |
| Sidebar body | `AppSidebar` always renders `DraftSection` in one `overflow-auto` `SidebarContent` | Plot route: `PlotSidebarPanel`, where only the two lists scroll. Other routes: `DraftSection`, unchanged. |
| Board header | `plot-header.tsx` | deleted; the refresh-failed and view-only notices stay |
| Board rows/columns | all rendered | only visible ones (`visiblePlot()`); Move menus use the full order |
| Filter state | none | `plot/state/plot-view.store.ts`, `atomWithStorage` under `nudo:plot-view:<projectId>` |
| Sidebar reorder | none | its own `DndContext`, reusing `reorderedIds`, `orderAnnouncements` (export it), `PLOT_DRAG_KEYS`, `ReorderHandle`, `reorderPlotlines` / `reorderBeats` |
| Checkbox | check whether it's vendored | `npx shadcn@latest add checkbox` if missing |

## Screens

| File | Shows |
| --- | --- |
| `screenshots/01-plot-view.png` | Plot route: Plotlines, Beats, counter; board without a header |
| `screenshots/02-row-hover-handle.png` | Hovering a row reveals its drag handle (left of the checkbox) |
| `screenshots/03-filtered.png` | "The Ashbys" and "Inciting incident" hidden: muted unticked rows, row and column gone from the board, counter "4 of 5 plotlines · 7 of 8 beats" |
| `screenshots/04-independent-scroll.png` | Short window: the Beats list is scrolled to the end while the Plotlines list, both headers, the counter and the account button stay put |

## Visual values

| | Value |
| --- | --- |
| Section label | `text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`, 32px row |
| Show all | text button, 12px, `text-muted-foreground`, right-aligned; disabled when nothing is hidden |
| Section gap | 14px |
| Section minimum | header + 3 rows (32 + 3 × 34px) |
| Row | 34px, radius 8px |
| Handle | 20px slot left of the checkbox, 14px grip, `text-muted-foreground`; opacity 0 until row hover / `:focus-within` / `pointer-coarse` |
| Checkbox | 16px, radius 4px, 1.5px border, 10px gap to the name. Plotline: its `bg-plot-*` colour (filled with a white tick when visible, outline when hidden). Beat: `prose`. |
| Name | 14px; `text-foreground` when visible, `text-muted-foreground` when hidden; truncates |
| Card count | 12px `text-muted-foreground`, right-aligned (plotlines only) |
| New row | 34px; `plus` 16px + "New plotline" / "New beat", `text-muted-foreground`, aligned with the checkbox column; last item in the scrolling list |
| Counter | 12px `text-muted-foreground`, `px-3 py-2.5`, may wrap; directly above the account button |
| Board | no header; the grid starts at the beat header row with 40px top padding |

### Token mapping

| Prototype | Token |
| --- | --- |
| `#FCFBF9` ground | `--background` / sidebar background |
| `#F0ECE6` | `--sidebar-accent` |
| `#ECE8E2` / `#E6E1D9` | `--border` |
| `#1F1E1C` / `#6B6862` text | `--foreground` / `--muted-foreground` |
| `#57544E` beat checkbox | `--prose` |
| Plotline colours | `--plot-*` via `PLOTLINE_COLOR_DOT_CLASS` |

## Notes

- `[Plotline 4]`, `[Beat 6]` etc. are placeholders. The card counter in the prototype stays at 33; the spec counts visible cards (open question 1).
- The prototype has 5 plotlines and 8 beats, so it only overflows in a short window. Screen 04 was captured at 640px height.

## Files in this bundle

- `README.md`: this file, the contract.
- `plot-sidebar.dc.html`: clickable prototype (filters work; Story/Plot via the switcher).
- `support.js`: prototype runtime. Don't edit it.
- `screenshots/`: captured from the prototype at 1440×900 @2x (sidebar crops at 300px wide).
