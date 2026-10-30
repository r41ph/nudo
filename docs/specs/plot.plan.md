# Plan: Plot

> Spec: `docs/specs/plot.md`
> Status: Approved — PR 1 in review (PR #45 — https://github.com/r41ph/nudo/pull/45)
> Tasks: `docs/specs/plot.tasks.md`
> Prerequisite: `docs/specs/projects.md` (PR 1 merged as #44)

Plot ships as **10 PRs**. Each one leaves the app valid, carries its own
tests, and lists what it does not include. PRs 1–3 are V1, a complete Board.
PRs 4–10 are the later committed directions, in dependency order.

## Changes from the brief's starting decomposition

| Brief | Plan | Why |
| --- | --- | --- |
| PR 2 Board + cards, PR 3 DnD | **PR 2 = cards + drag and drop** | You asked for this merge. Card movement is the main interaction, and reviewing cards without it means reviewing a placeholder ordering model twice. |
| PR 5 linking (+ maybe create-scene) | **PR 4 links, PR 5 create scene** | Create-scene adds a new SQL function and an outline-picker flow, which is coherent enough to review on its own and small. |
| Beat → manuscript link (unplaced) | **In PR 4** | Same column pattern, same trigger branch and same picker as card links. |
| PR 6 images | **Moved last (PR 10)** | Blocked on a file-storage spec (Deck card). Nothing else depends on it. |
| PR 8 presentation controls | **Folded into PR 6** | The View menu exists for connection visibility. Show descriptions is a one-line addition. Images add their toggle in PR 10. |

## Schema decisions that must be right early

These are expensive to change after PR 1 or 2:

1. **Plot rows are owned by `project_id`, with `user_id` as the RLS key**
   (PR 1). Getting the owner wrong means migrating every Plot row.
2. **There is no `plots` table** (PR 1). One Plot per project, keyed by
   `project_id`. Story-level data gets its own table when Overview needs it.
3. **Card placement is nullable as a pair** (`CHECK` both-or-neither) from
   PR 2, even though Unassigned UI is PR 3.
4. **Card → plotline/beat foreign keys are `RESTRICT`** (PR 2). Switching
   later from `CASCADE` would mean a constraint migration plus a behaviour
   change in the middle of the feature.
5. **Colour is stored as a palette key, not a hex value** (PR 1).
6. **The shared `plot_check_owner` trigger function** (PR 1). Later PRs only
   add branches to it, never a second mechanism.

Everything else (`document_id`, connections, overview, `key_beat`, images)
arrives in its own PR's migration.

## Migrations

`024` is taken by `projects.md` (`024_create-projects.ts`, merged). Renumber
if anything else lands in between.

| # | File | PR | Contents |
| --- | --- | --- | --- |
| 025 | `025_plot-foundation.ts` | 1 | `plotlines`, `plot_beats`, RLS, `plot_check_owner()` + triggers, `start_plot`, `reorder_plotlines`, `reorder_plot_beats` |
| 026 | `026_plotline-palette.ts` | 1 | Neutral colour keys `color1`–`color8` (added after the plan) |
| 027 | `027_plot-cards.ts` | 2 | `plot_cards` (nullable pair, `RESTRICT`), trigger branch, `move_plot_card` |
| 028 | `028_plot-structure-delete.ts` | 3 | `delete_plotline(id, keep_cards)`, `delete_plot_beat(id, keep_cards)` |
| 029 | `029_plot-manuscript-links.ts` | 4 | `plot_cards.document_id`, `plot_beats.document_id` (`SET NULL`), trigger branch for same-project documents |
| 030 | `030_fn-create-scene-from-card.ts` | 5 | `create_scene_from_card(card_id, parent_id)` |
| 031 | `031_plot-connections.ts` | 6 | `plot_connections`, RLS, trigger branch (both cards in the same project) |
| 032 | `032_fn-append-plot-beats.ts` | 7 | `append_plot_beats(project_id, names text[])` |
| 033 | `033_plot-overview.ts` | 8 | `plot_overviews`, `plot_cards.key_beat` |
| — | none | 9 | Timeline is derived; no schema |
| 0xx | decided by the storage spec | 10 | Card image reference |

---

## PR 1 — Plot foundation

**Goal.** Give Plot its correct ownership and structure (plotlines and
beats) and a usable empty state, before any card complexity arrives.

**Depends on.** Projects PR 1 (scoping and URLs).

**Schema/API.** Migration 025. `start_plot(project_id)` creates "Main plot"
plus Beginning/Middle/End atomically, and is a no-op if the project already
has any plotline or beat. Generic PostGraphile create, update and delete for
plotlines and beats (RLS plus the trigger). Both reorder functions take
`(project_id, ids uuid[])` and renumber densely, rejecting ids from other
projects. `GET_PLOT`.

**UI.** The Tools rail item Timeline is renamed **Plot**, enabled and linked
to `/project/:projectId/plot`. Plot page with loading, error and empty
states. A board shell with sticky plotline labels (dot, name, "0 cards")
and beat headers, with no cells yet. **Add plotline** / **Add beat** /
**+ Plotline**. Plotline and beat menus: Rename (inline), Colour, Move
up/down/left/right, Delete (always empty in this PR). `--plot-*` tokens with
contrast checks. Read-only mode below 1024px.

**Tests.** API: CRUD, RLS isolation, foreign-project rejection through the
generic mutations and both reorder functions, `start_plot` atomicity and
idempotency. Web: empty → Start plot, every menu action, rollback and toast
on a failed reorder, read-only below the breakpoint. Stories: `PlotEmpty`,
`PlotlineLabel`, `BeatHeader` (with menus), board shell. No e2e yet.

**Excluded.** Cards, drag and drop, Unassigned, links, connections,
templates, View menu.

**Review risk.** Medium. It is the first project-scoped feature table and
sets the trigger pattern.

## PR 2 — Cards and drag and drop

**Goal.** A working Board: cards in cells, moved by mouse and keyboard.

**Depends on.** PR 1.

**Schema/API.** Migration 027. `move_plot_card(card_id, plotline_id,
beat_id, ordered_ids uuid[])` writes the destination order; a NULL pair is
allowed by the schema but not used by the UI until PR 3. Generic card create,
update and delete. Plotline and beat drag reuses the PR 1 reorder functions.

**UI.** Cells, `PlotCard`, Add card target, `CardEditorDialog` (title,
description, Location, Save/Cancel, discard prompt, inline delete). Location
uses the existing `DropdownMenu` (radio items). shadcn `select` would add
`@radix-ui/react-select`, a new package, so ask before switching.
`@dnd-kit` multi-container sortable for cards, sortable rows and columns,
`KeyboardSensor`, custom announcements. Deleting a populated plotline or beat
is disabled, with a hint. Header summary counts.

**Tests.** API: card CRUD, the owner trigger (a card pointing at another
project's plotline or beat), the both-or-neither CHECK, `RESTRICT` blocks a
generic delete of a populated plotline, `move_plot_card` across cells and
projects. Unit: `applyCardMove`, cell grouping. Web: add, edit, cancel,
discard, delete; keyboard move; rollback on a failed move. Stories:
`PlotCard` (default, untitled, long, dragging), board populated, dense, and
read-only. E2E #1 (start → add → drag → reload).

**Excluded.** Unassigned UI, delete-with-cards, links, connections, View
menu.

**Review risk.** High. Optimistic multi-container drag and drop is the
largest UI surface in the feature. The PR is kept in reviewable commits:
schema → cards CRUD → card drag and drop → row/column drag and drop.

## PR 3 — Unassigned and safe structural deletion

**Goal.** Ideas survive structural changes.

**Depends on.** PR 2.

**Schema/API.** Migration 028. `delete_plotline` / `delete_plot_beat(id,
keep_cards)`: keeping cards nulls the pair and appends the cards to
Unassigned in their current order; not keeping them deletes the cards. One
transaction each.

**UI.** The Unassigned tray (collapsible, count, drop target while dragging).
"Unassigned" in the card editor's Location. The delete dialog with **Keep the
cards** (primary) and **Delete the cards too**. The PR 2 disabled state is
removed.

**Tests.** API: both modes of both functions, ordering of the moved cards,
foreign-project rejection. Web: delete keeping cards, delete with cards,
drag into and out of the tray, Location set to Unassigned. Stories:
`UnassignedTray` (empty-while-dragging, populated), the delete dialog.

**Excluded.** Links and everything after.

**Review risk.** Low–medium.

## PR 4 — Manuscript links

**Goal.** Connect cards and beats to the real manuscript with stable ids.

**Depends on.** PR 2 (cards), Projects PR 1.

**Schema/API.** Migration 029. `document_id` on cards and beats, `ON DELETE
SET NULL`, and a trigger branch requiring the document to be in the same
project and not a separator. `GET_PLOT` selects the linked document's `id`
and `title` through the relation, so the title is always live.

**UI.** A link line on cards ("↗ 2. The logbook", numbered by outline order,
opens the document). The card editor's Manuscript row with Link, Unlink and
Open. Link…/Unlink in the beat menu, with the linked folder shown as a muted
second line in the header. `ManuscriptPicker` popover: a filterable outline
list built with `Input` plus a `listbox`, with no `cmdk` dependency. The
outline's delete dialog gains "N plot cards link here; they'll stay on your
board."

**Tests.** API: link, unlink, rename shows through, document delete leaves
the card with a NULL link, cross-user and cross-project rejection, separator
rejection. Web: picker by keyboard, open linked document, renamed title
updates after invalidation, outline delete warning. E2E #2.

**Excluded.** Create scene, moving the manuscript with the card.

**Review risk.** Medium. It touches the outline's delete dialog.

## PR 5 — Create scene from card

**Goal.** Turn a planned card into a real manuscript document, keeping the
card.

**Depends on.** PR 4.

**Schema/API.** Migration 030. `create_scene_from_card(card_id, parent_id)`
reuses `create_node`'s insert path in the card's project, sets the card's
`document_id`, and runs atomically.

**UI.** **Create scene…** in the card editor (hidden when the card is
already linked). The parent picker reuses `ManuscriptPicker` (folders and
root), defaulting to the beat's linked folder. On success: a toast with
**Open scene**, and the outline is invalidated.

**Tests.** API: atomicity (a failure leaves no orphan document), title
seeding, the project check. Web: create flow, default parent, error keeps
the dialog open.

**Excluded.** Any title sync after creation.

**Review risk.** Low.

## PR 6 — Connections and the View menu

**Goal.** Persistent relationships between cards, shown without clutter.

**Depends on.** PR 2.

**Schema/API.** Migration 031. `plot_connections` (CASCADE on its endpoints,
UNIQUE pair, no self-links), RLS, a trigger branch requiring both cards to be
in the row's project.

**UI.** The card editor's **Connections** list and **Connect to…** picker
(label, colour, direction). `ConnectionLayer` SVG with no dependency. The
View menu (Show descriptions, Connections: Off / Selected / All) persisted in
`localStorage`. Selected-mode focus rules and dimming.

**Tests.** API: CRUD, cascade on card delete, unique and self-link
constraints, cross-project rejection. Unit: path geometry helpers. Web:
create and delete a connection by keyboard, visibility modes, preference
persisted across remount and safe when storage throws, text listing of
connections. Stories: the connection layer in each mode. E2E #3.

**Excluded.** Drag-to-connect, connection types, graph layout.

**Review risk.** Medium–high, because of rendering correctness while
scrolling and resizing.

## PR 7 — Structural templates

**Goal.** Optional methodology starting points on the same primitives.

**Depends on.** PR 1.

**Schema/API.** Migration 032. `append_plot_beats(project_id, names[])`.

**UI.** Structure definitions in constants. "Or start from a structure…" on
the empty state, and **Add structure…** in the header menu. Both append beats
and never remove anything.

**Tests.** API: append order, foreign-project rejection. Web: picking a
structure on an empty and on a populated board.

**Excluded.** Act bands and markers.

**Review risk.** Low.

## PR 8 — Overview

**Goal.** "What is this story?" on one screen.

**Depends on.** PR 2.

**Schema/API.** Migration 033. `plot_overviews` (`premise`,
`dramatic_question`) and `plot_cards.key_beat`, with the 9-key-beat limit
enforced in the UI and checked by a trigger.

**UI.** Board/Overview `Tabs` with the view in the URL. Premise and
dramatic-question fields (autosaved on blur). The key-beat list in board
order. Mark as key beat from the card editor.

**Tests.** API: RLS, limit trigger. Web: edit fields, toggle key beats, edit
a card from Overview and see it change on Board.

**Excluded.** Theme and any further story fields.

**Review risk.** Low.

## PR 9 — Timeline

**Goal.** The same cards shown in narrative order.

**Depends on.** PR 2 (PR 8 for the tab pattern, if it has landed).

**Schema/API.** None.

**UI.** A Timeline tab, a horizontal sequence in derived narrative order,
plotline colour on each card, and the card editor on click.

**Tests.** Unit: narrative-order derivation. Web: rendering and editing a
card from Timeline.

**Excluded.** Story chronology.

**Review risk.** Low.

## PR 10 — Card images

**Blocked** on a file-storage spec (Deck card 173, "Plot: optional card
images"). Scope when unblocked: attach, replace and remove one image per
card; render it; the View menu's Show images; hide images below 1024px.

---

## Order and parallelism

```
Projects PR1 ─► Projects PR2
     │
     └─► PR1 ─► PR2 ─┬─► PR3
                     ├─► PR4 ─► PR5
                     ├─► PR6
                     ├─► PR8 ─► PR9
                     └─► (PR10, after storage)
          PR1 ─► PR7
```

V1 is done when PR 3 merges.
