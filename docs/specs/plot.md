# Spec: Plot

> Status: Approved — PR 1 merged (PR #45 — https://github.com/r41ph/nudo/pull/45); PR 2 in review (PR #49 — https://github.com/r41ph/nudo/pull/49)
> Branch: `feat/plot-tool`
> Depends on: `docs/specs/projects.md` (PR 1 merged as #44)
> Delivery: `docs/specs/plot.plan.md`, tasks in `docs/specs/plot.tasks.md`
> Visual reference: `nudo-design/plot tool/nudo — Plot tool.pdf` (mockups; this spec wins where they disagree)

This is the authoritative specification for Plot. It replaces the earlier
`plot-timeline.md` draft. No other document is needed to understand the
product.

## 1. Objective

Give a novelist a visual place to plan a long-form story before and while
drafting it. The mental model:

> **Index cards on a desk, connected to the actual manuscript when useful.**

Plot borrows from index cards, corkboards, plot grids, timelines and story
maps, and stays true to nudo: minimal, low visual load, nothing to configure
before it is useful, more capability revealed only when it is asked for,
built for writers rather than for databases, and neutral about plotting
methodology.

Plot is **not** a spreadsheet, a database admin screen, an infinite canvas,
a mind map or a world-building suite.

## 2. Corrections from the previous draft

| # | Old (`plot-timeline.md`) | New |
| --- | --- | --- |
| 1 | `plot-timeline` was the core domain. | **Plot** is the domain. Board, Timeline and Overview are **views** over one set of Plot data. Board ships first, and neither Board nor Timeline is the data model. |
| 2 | A beat was "a chapter or story moment"; Start created "Chapter 1"; new beats were "Chapter N". | A **beat** is a position in the planning structure (Opening, Midpoint, Beginning, anything). It is not a chapter. Start plot creates **Beginning / Middle / End**, and new beats are "Untitled beat". No fake chapter list exists alongside the manuscript. |
| 3 | Cards were independent copies until a later, vaguely defined linking module. | Cards stay independent entities. The architecture has **optional stable-ID links** from a card (and a beat) to real manuscript documents. Plot never stores a copy of a manuscript title. |
| 4 | Deleting a populated plotline or beat silently cascaded its cards, and the mockup's dialog says "every card in its row will be removed". | Deletion is designed, not left to SQL cascades. Card → plotline/beat foreign keys are `RESTRICT`. Deleting a populated plotline or beat asks whether to **move its cards to Unassigned** (the default) or delete them. See §10. |
| 5 | One plot per user; more than one plot was out of scope. | Plot belongs to a **project** (one book). The projects spec adds projects first. Each project has one Plot. `user_id` stays the RLS key; `project_id` is the domain owner. |
| 6 | One large implementation. | Ten small PRs ordered by dependency, each with its own tests (`plot.plan.md`). |
| 7 | Route `/plot`, owned by the user. | `/project/:projectId/plot`, matching the project-scoped URLs from the projects spec. |
| 8 | "Reuse the outline's `@dnd-kit` setup." | Repository fact: the outline uses `@headless-tree`. `@dnd-kit` is installed in `apps/web` but nothing imports it. Plot uses `@dnd-kit` (no new dependency) and sets the pattern itself. |
| 9 | Plotline colour stored as a key with no palette defined. | It is still a key, but a neutral one (`color1`–`color8`); the web app maps each key to a colour (§6.2). |

## 3. Domain model: one Plot, several views

```
                 PROJECT (one book)
                      │
     ┌────────────────┼──────────────────────────────┐
  documents        PLOT DATA                          │
 (manuscript)  plotlines · beats · cards · connections
     ▲             │
     └── optional stable-ID links (card → document, beat → document)
                   │
       ┌───────────┼────────────┐
     Board      Timeline     Overview      ← views; none owns data
```

- A project has exactly one Plot. There is **no `plots` table**: every Plot
  row carries `project_id`. A table with a single row per project and no
  columns of its own would be speculative. Story-level fields arrive with
  Overview in their own table (§13).
- Editing a card anywhere edits that card everywhere. No view keeps a copy
  of another view's data.

## 4. Repository facts (inspection, not assumptions)

| Question | Answer from the repo |
| --- | --- |
| Top-level book entity | None today. Added by `projects.md` (`projects` table; `documents.project_id`). |
| Multiple novels per user | Not today; yes once projects lands. |
| Chapters, folders, scenes | One `documents` tree: `kind` ∈ `folder` / `document` / `separator`, with `parent_id` and `position`. A "chapter" is usually a folder and a "scene" a document, but writers decide. |
| Stable IDs | `documents.id` (uuid). Titles change; ids don't. |
| Document moves | `move_and_reorder_node` (SECURITY DEFINER, `search_path` pinned), guarded by the `documents_check_parent` trigger. |
| Document delete | Hard delete. `document_versions`, `document_settings` and `discussions` cascade. A deleted folder's subtree is removed client-side through `navigateAfterRemoval`. |
| Image/asset storage | None. No upload code, bucket or asset table. Card images are blocked on a storage spec (Deck card "Plot: optional card images"). |
| User preferences | The toolbar is stored on `users` (`update_user_toolbar`). The daily word baseline is in `localStorage`. |
| Ownership and RLS | `user_id` column with four `*_own` policies keyed on `current_setting('app.current_user_id')`; role `nudo_visitor`. |
| Reorder SQL | `move_and_reorder_node` takes a JSON positions array and renumbers per sibling set. |
| Drag and drop | Outline: `@headless-tree/core` `dragAndDropFeature`. `@dnd-kit/*` is installed but unused. |
| UI components | `dropdown-menu`, `dialog`, `alert-dialog`, `popover`, `input`, `textarea`, `label`, `button`, `tooltip`, `switch`, `skeleton`, `separator`, `sheet` (shadcn, vendored); `Icon` registry; `sonner` toasts. |
| Sidebar Tools rail | `SIDEBAR_TOOLS` has Story (active), Characters and Timeline (both disabled). |

## 5. Scope classification

| Capability | Class | PR |
| --- | --- | --- |
| Plot domain foundation (project-owned, RLS, integrity) | **V1 — committed now** | 1 |
| Board view (grid, sticky headers, empty state) | **V1** | 1–2 |
| Plotlines (CRUD, colour, reorder) | **V1** | 1 |
| Beats (CRUD, reorder) | **V1** | 1 |
| Cards (title, description, CRUD) | **V1** | 2 |
| Drag/drop and keyboard reordering | **V1** | 2 |
| Unassigned cards and safe structural deletion | **V1** | 3 |
| Manuscript links (card → document, beat → document) | **Later — committed direction** | 4 |
| Create scene from card | **Later** | 5 |
| Card connections and visibility (Off / Selected / All) | **Later** | 6 |
| Card presentation controls (View menu) | **Later** (ships with PR 6) | 6 |
| Structural templates (None, Three Act, …) | **Later** | 7 |
| Overview | **Later** | 8 |
| Timeline (narrative order) | **Later** | 9 |
| Card images | **Later** (blocked on a storage spec) | 10 |
| Narrative vs story chronology | **Future exploration** | — |
| Character / place references on cards | **Future exploration** | — |
| Card groups | **Future exploration** | — |
| "Move manuscript too" when moving a linked card | **Future exploration** | — |
| Structural markers from templates | **Future exploration** | — |

"V1" means PRs 1–3: a complete, useful Board.

## 6. Entities

All Plot tables share these rules:

- `id uuid PK DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL DEFAULT current_setting('app.current_user_id', true)::uuid → users ON DELETE CASCADE`
  — the RLS key. Clients never send it.
- `project_id uuid NOT NULL → projects ON DELETE CASCADE` — the domain owner.
  Deleting a project is the deliberate, typed-confirmation action defined in
  `projects.md`, so cascading here is intended behaviour, not an accident.
- `created_at`, `updated_at timestamptz NOT NULL DEFAULT now()`
- Four `*_own` RLS policies identical to `documents`.
- A `plot_check_owner` trigger (shared function, one trigger per table)
  rejects any row whose `project_id` belongs to a different user, and any
  reference (plotline, beat, card, document) whose `project_id` differs from
  the row's. It fires on INSERT and on UPDATE of the relevant columns, so
  generic PostGraphile mutations cannot bypass it.
- `position int NOT NULL`, dense within its sibling set, rewritten by the
  reorder functions.

### 6.1 Plotline — `plotlines`

A horizontal story thread whose meaning the writer decides (Main plot, Ada,
Romance, 1987…). There is no type enum.

| Column | Type |
| --- | --- |
| `name` | `text NOT NULL DEFAULT 'Untitled plotline'`, 1–120 chars after trim |
| `color` | `text NOT NULL`, CHECK `color1`–`color8` (§6.2) |
| `position` | among the project's plotlines |

### 6.2 Plotline palette

The database stores neutral keys, `color1` to `color8` (migration 026
replaced 025's named keys). `plot.constants.ts` maps each key to its label and
a `--plot-<colour>` token in `packages/ui/src/tailwind.css`, so the palette can
be redesigned without a migration. The colours differ enough in hue and
lightness to stay distinct as 12px dots. The ≥3:1 contrast rule does not apply
to them: the dot is never the only cue, because the plotline's name is always
shown beside it. Orange, green, blue and pink sit below 3:1 in light mode.

| Key | Label | Light | Dark |
| --- | --- | --- | --- |
| `color1` | Red | `#f04a4a` | `#f04a4a` |
| `color2` | Orange | `#faa916` | `#faa916` |
| `color3` | Brown | `#8b5e3c` | `#8b5e3c` |
| `color4` | Green | `#34c759` | `#34c759` |
| `color5` | Black | `#000000` | `#ffffff` |
| `color6` | Blue | `#00a3ff` | `#00a3ff` |
| `color7` | Violet | `#ab64f2` | `#ab64f2` |
| `color8` | Pink | `#ff69b4` | `#ff69b4` |

A new plotline takes the first key not yet used in the project, then cycles
round once all eight are used.

### 6.3 Beat — `plot_beats`

A position in the planning structure: Opening, Inciting incident, Midpoint,
or simply Beginning / Middle / End. It is not inherently a chapter.

| Column | Type | PR |
| --- | --- | --- |
| `name` | `text NOT NULL DEFAULT 'Untitled beat'`, 1–120 chars | 1 |
| `position` | among the project's beats | 1 |
| `document_id` | `uuid NULL → documents ON DELETE SET NULL` — optional link to real manuscript structure (usually a folder) | 4 |

### 6.4 Card — `plot_cards`

A planning idea, independent of the manuscript. "Mother already knew? Maybe
before the inquiry." is a valid card.

| Column | Type | PR |
| --- | --- | --- |
| `title` | `text NOT NULL DEFAULT ''`, ≤200 | 2 |
| `description` | `text NOT NULL DEFAULT ''`, no length limit | 2 |
| `plotline_id` | `uuid NULL → plotlines ON DELETE RESTRICT` | 2 |
| `beat_id` | `uuid NULL → plot_beats ON DELETE RESTRICT` | 2 |
| `position` | within its cell, or within Unassigned | 2 |
| `document_id` | `uuid NULL → documents ON DELETE SET NULL` | 4 |
| `key_beat` | `boolean NOT NULL DEFAULT false` (Overview) | 8 |

- **Placement:** `CHECK ((plotline_id IS NULL) = (beat_id IS NULL))`. A card
  is either placed in a cell or **Unassigned**. The columns are nullable from
  PR 2, even though the Unassigned UI ships in PR 3, so preserving cards
  never needs a schema change.
- **`RESTRICT`**, not `CASCADE` or `SET NULL`. A generic
  `deletePlotlineById` on a populated plotline fails, so the only way to
  delete populated structure is through the functions in §10, which make the
  choice explicit.
- There is **no metadata form**: no POV, location, characters, goal,
  conflict or status. Those belong to other nudo features and may be
  referenced later (§15).
- An `image` reference arrives with the image PR, designed against the
  storage spec. No column is reserved for it now.

### 6.5 Connection — `plot_connections` (PR 6)

A persistent relationship between two cards. It is not DOM decoration.

| Column | Type |
| --- | --- |
| `from_card_id`, `to_card_id` | `uuid NOT NULL → plot_cards ON DELETE CASCADE`; CHECK `from <> to`; UNIQUE `(from_card_id, to_card_id)` |
| `color` | palette key (§6.2), chosen independently of either card's plotline colour |
| `label` | `text NULL`, ≤80 chars, optional |
| `directed` | `boolean NOT NULL DEFAULT true` (arrow, or a plain line for "related") |

There is no `type` column. Cause→effect, setup→payoff and similar meanings
go in the optional label. A typed taxonomy is future exploration, and adding
it later is a single nullable column.

## 7. Board view

The first view, and the one V1 delivers.

### 7.1 Layout

- Route: `/project/:projectId/plot`. The Tools rail item **Timeline** is
  renamed **Plot**, enabled and linked. Its active state comes from the
  route.
- **Header:** "Plot" (serif) followed by a muted summary ("3 plotlines · 6
  beats · 11 cards"). On the right are **Add beat** and **Add plotline**, and
  from PR 6 a **View** menu.
- **Grid:** plotlines are rows and beats are columns. The plotline label
  column (200px) sticks to the left and shows the colour dot, name and card
  count. The beat header row sticks to the top. Beat columns are 240px
  (`PLOT_BEAT_COLUMN_WIDTH`). The grid scrolls in both directions inside the
  main area, and the window itself never scrolls sideways.
- **Card:** a white surface on the board ground. The title is serif and
  wraps fully. A 2px rule in the plotline colour sits under the title. The
  description is sans, muted and clamped to 3 lines. An untitled card shows
  "Untitled card" in muted italic.
- **Empty cell:** no border and no fill. On hover or `:focus-within`, a
  dashed **Add card** target appears (mockup page 4). The button is always in
  the DOM and in the tab order, so it is reachable without hover.
- Below the last row is **+ Plotline**, and from PR 3 the Unassigned tray
  (§9).

### 7.2 Empty state

The title is "Lay out your story" and the body is "Plotlines run across,
beats run down the page. Pin each idea where it belongs, like index cards on
a desk." The single action is **Start plot**, which creates one plotline
("Main plot", `color1`) and three beats (Beginning, Middle, End) in one
transaction, then shows the board. ("Scene" in the mockup copy is replaced
with "idea": cards are not scenes.)

### 7.3 Plotline and beat menus

A `⋯` button sits on each plotline label and beat header. It is visible on
hover or focus and always in the tab order.

- Plotline: **Rename**, **Colour** (swatches, each `aria-label`led with the
  colour name, the current one marked `aria-checked`), **Move up**, **Move
  down** (disabled at either end), **Delete plotline…**.
- Beat: **Rename**, **Move left**, **Move right**, **Delete beat…**. From
  PR 4 it also has **Link to manuscript…** / **Unlink**.
- Rename happens inline in the label or header. It commits on blur or Enter
  and cancels on Escape. An empty value keeps the old name.

### 7.4 Card editor

Clicking a card, or pressing Enter on it, opens the **Edit card** dialog
(mockup page 7):

- The context line shows the plotline dot, plotline name and beat name, or
  "Unassigned".
- **Title** gets focus on open. **Description (optional)** is a growing
  `Textarea`.
- **Location** has two selects, Plotline and Beat. This is the keyboard and
  pointer alternative to dragging a card to another cell. Choosing
  "Unassigned" clears both (PR 3).
- From PR 4 there is a **Manuscript** row (link, unlink, open). From PR 6
  there is a **Connections** list.
- **Save** / **Cancel**. Editing is explicit and does not autosave: a dialog
  that saves while you type makes Cancel meaningless. Closing with unsaved
  changes asks "Discard changes?".
- **Delete** confirms inline in the dialog footer ("Delete this card? This
  can't be undone." with **Keep** and **Delete card**), as in mockup page 8.
- **Add card** opens the same dialog, empty, already placed in the chosen
  cell.

### 7.5 Moving and reordering (PR 2)

- Cards: drag within a cell to reorder, or across cells to move. This uses
  `@dnd-kit/sortable` with one `SortableContext` per cell plus the
  Unassigned tray. During a drag, the source is a faded ghost and the target
  cell is tinted with the accent and outlined (mockup page 6).
- Plotlines and beats: drag a row by its label or a column by its header,
  or use the Move items in §7.3.
- Keyboard: dnd-kit's `KeyboardSensor` (Space picks up, arrows move, Space
  drops, Escape cancels). Custom `announcements` read "Picked up card 'The
  keeper's logbook' in Main plot, Middle", and so on.
- Persistence: optimistic. `move_plot_card` and `reorder_plotlines` /
  `reorder_plot_beats` send the full destination order. On failure the move
  rolls back and a toast appears.

## 8. Manuscript relationships (PRs 4–5)

### 8.1 Linking

- A card or beat may hold `document_id`, a stable reference to a document in
  the **same project**. The trigger enforces this, so a link to another
  user's or another project's document is impossible through any mutation.
- Plot shows the linked document's **live** title by joining through
  `document_id`. Nothing is copied. Renaming the document in the outline
  updates Plot.
- Many cards may link to the same document: two plot ideas can play out in
  one scene.
- On a card, a link appears as one muted line below the description:
  "↗ 2. The logbook". The number is the document's position in outline
  order. Clicking it opens `/project/:projectId/document/:id`.
- **Link…** opens a `Popover` with the project outline as a filterable list
  (folders and documents; separators excluded). It works fully by keyboard.
- **Unlink** clears `document_id` and leaves the card or beat untouched.

### 8.2 Plot order and manuscript order are independent

Moving a linked card to another beat means "I'm changing my plan". **It
never moves, renames or reorders anything in the manuscript**, and
reordering the outline never moves cards. This is the least surprising
model: the outline already has its own drag-and-drop and reorder functions,
and a hidden two-way sync would rearrange the manuscript as a side effect.
An explicit "Move the manuscript scene too" action is future exploration.

### 8.3 Create scene from card (PR 5)

From the card editor, **Create scene…** asks where to put the new document
(a parent in the outline, default: the beat's linked folder if there is one,
otherwise the root). `create_scene_from_card(card_id, parent_id)` then, in
one transaction:

1. calls the same insert path as `create_node` in the card's project,
   seeding the document title from the card title;
2. sets `plot_cards.document_id` to the new document;
3. returns both.

The seeded title is a one-time starting value. From then on the card keeps
its own title and shows the document's live title in its link line, so
nothing has to be kept in sync.

## 9. Unassigned cards (PR 3)

- Cards with no plotline and beat live in the **Unassigned** tray, a
  collapsible strip below the grid: "Unassigned · 4". It is hidden when
  empty, except as a drop target while a drag is in progress.
- Cards end up there when the writer moves them there (drag, or the card
  editor's Location), or when structure is deleted with the "keep cards"
  choice (§10).
- Cards move out of the tray by drag or through Location.
- Unassigned cards keep their order (`position` among unassigned cards in
  the project).

## 10. Deletion semantics

| Deleting… | Behaviour |
| --- | --- |
| An empty plotline or beat | Deleted at once from the menu, with no dialog. A toast confirms it. |
| A populated plotline or beat (PR 2) | The menu item is disabled, with the hint "Move or delete its cards first". The app stays valid until PR 3. |
| A populated plotline or beat (PR 3+) | A dialog: "Delete 'Subplot B'? It has 2 cards." The primary choice is **Keep the cards** (move them to Unassigned); the destructive choice is **Delete the cards too**. Each runs `delete_plotline(id, keep_cards boolean)` / `delete_plot_beat(...)` in one transaction. |
| A card | Inline confirmation in the editor. Hard delete. Its connections are removed with it (PR 6). |
| A connection's endpoint card | The connection is deleted (`ON DELETE CASCADE`). A connection with one end can't be drawn or understood. |
| A connection | From the card editor's Connections list, or the connection's own popover. No confirmation; a toast confirms it. |
| A linked manuscript document | The card or beat survives and its link is cleared (`ON DELETE SET NULL`). From PR 4, the outline's delete dialog adds "2 plot cards link here; they'll stay on your board." |
| A card image (PR 10) | Removes the card's reference. Whether the stored file is deleted is settled in the storage spec. |
| The project | Everything in Plot is deleted with it. This is the typed-confirmation delete from `projects.md`. |
| The user account | Cascades, as all user data does today. |

## 11. Connections (PR 6)

- **Create:** in the card editor, **Connect to…** opens a filterable list of
  the other cards ("Title — Plotline · Beat"). Pick one, then optionally set
  a label, colour (default `color5`) and direction. Everything works by
  keyboard. Dragging a line from one card to another is future exploration.
- **Render:** a single absolutely positioned `<svg>` inside the grid's
  scroll container, `pointer-events: none`, drawing a cubic path from the
  edge of one card to the edge of the other. Card rectangles come from
  `ResizeObserver` and the layout of the scroll container. **No new
  dependency.** Lines, arrowheads and label chips are plain SVG.
- **Visibility:** **Off**, **Selected** (the default) or **All**. In
  Selected mode the "selected card" is the card with focus, or the card
  whose editor was last closed (focus returns to it). Clicking empty board
  or pressing Escape clears the selection. Only that card's connections are
  drawn, and every other card dims slightly.
- **Not colour alone:** directed connections have arrowheads, undirected
  ones are dashed, and labels render on the line. The card editor lists
  every connection as text ("→ Opens locked room · setup"), and the card
  announces "2 connections" to screen readers.
- Board stays a grid. Connections never move cards, and there is no
  free-form positioning.

## 12. Presentation controls (PR 6)

A **View** `DropdownMenu` in the Plot header contains:

- **Show descriptions** (on by default)
- **Connections:** Off / Selected / All
- **Show images** (added in PR 10)

These are presentation preferences, not Plot data. They are stored in
`localStorage` under `nudo:plot-view:<projectId>` (read and written inside
`try/catch`, with the defaults when storage is unavailable). This matches
`use-daily-word-delta`. Losing them costs nothing, so they don't justify a
server column. The toolbar stays the only preference stored on the server.

## 13. Later views

### 13.1 Overview (PR 8)

It answers "What is this story?" and fits on one desktop screen.

- `plot_overviews` (`project_id` PK, `premise text ≤500`,
  `dramatic_question text ≤300`). These are the only story-level fields.
  **Theme is left out**: writers usually discover it while drafting, and it
  invites essay-length input. Adding more fields needs a spec change.
- **Key beats** are existing cards with `key_beat = true`, listed in board
  order (beat position, then plotline position, then card position). There
  are at most 9; at the limit the toggle explains why it is disabled. Editing
  a key beat opens the same card editor.
- Navigation: a **Board / Overview** segmented control (`Tabs`) in the Plot
  header, with the view in the URL (`…/plot/overview`).

### 13.2 Timeline (PR 9)

- The same cards rendered as one horizontal sequence in **narrative order**,
  which is derived (beat, then plotline, then card position) and needs no
  new data. Each card shows its plotline colour.
- Read-mostly in its first version. Editing opens the same card editor, and
  reordering stays on Board.
- **Story chronology** (flashbacks, nonlinear stories) is future
  exploration. When it comes, it adds nullable ordering or date fields to
  `plot_cards`, so the same cards appear in a second ordering and no
  duplicate "events" are created. Nothing in the current schema blocks this.

## 14. Structural templates (PR 7)

- **Structure:** None (the default), Three Act, Save the Cat, Story Circle,
  Hero's Journey. These are definitions in code
  (`plot-structures.constants.ts`), each a list of beat names. There is no
  table.
- Applying one, from the empty state ("or start from a structure…") or from
  the header, calls `append_plot_beats(project_id, names text[])`. It
  **adds** beats and never deletes or renames the writer's own. The result is
  ordinary beats that the writer can change freely.
- Everything in Plot works with Structure: None. Template-specific
  annotations (act bands, percentage markers) are future exploration.

## 15. Not dependent on other tools

Plot works fully without Characters or Places. Card references to
characters or places, and card groups (sequences, flashbacks, acts), are
future exploration. They are not to be added as chips or metadata during
Plot work.

## 16. Persistence

These follow the existing TanStack Query patterns:

- One query, `GET_PLOT(projectId)`, returns plotlines, beats, cards (and
  later connections) under the key `['plot', projectId]`.
- Structure edits and moves are optimistic: `onMutate` cancels
  `['plot', projectId]`, snapshots it and applies the change; `onError`
  rolls back and calls `toast.error(PLOT_SAVE_ERROR, { id: PLOT_SAVE_ERROR_ID })`;
  `onSettled` invalidates.
- The card editor is pessimistic: Save shows a pending state, and on error
  the dialog stays open with the message inline plus the toast, and the text
  is never lost.
- A query error shows an error state with **Retry**. Nothing is swallowed.
- Positions: inserts send `max + 1` from the cache, and reorder functions
  renumber densely, so any drift heals on the next move.

## 17. Security and integrity

- RLS on every Plot table.
- `plot_check_owner` (§6) protects card→plotline, card→beat, card→document,
  beat→document, connection→cards and every row→project, on all write
  paths.
- Every `SECURITY DEFINER` function (`start_plot`, `move_plot_card`,
  `reorder_plotlines`, `reorder_plot_beats`, `delete_plotline`,
  `delete_plot_beat`, `create_scene_from_card`, `append_plot_beats`) pins
  `search_path = pg_catalog, public`. Each checks that the project belongs
  to `current_uid` and that every id passed in belongs to that project, and
  raises an error otherwise. Each has API integration tests for cross-user
  and cross-project rejection.

## 18. Accessibility

- Drag and drop always has a non-drag path: the menus (Move up/down/left/right),
  the card editor's Location, and dnd-kit's keyboard sensor with spoken
  announcements.
- Every control is in the tab order and visible on focus, not only on hover.
- Dialogs focus their first field and return focus to the card or menu
  trigger they came from.
- Colour swatches have names. Plotlines are named in text wherever their
  colour appears (row labels, the editor's context line).
- Connections never rely on colour alone (§11).
- Save failures and status changes use `role="status"` / toasts. Moves are
  announced.

## 19. Responsive behaviour

- **Editing** needs a viewport of at least **1024px**
  (`PLOT_EDIT_MIN_WIDTH`). Below 1280px the sidebar collapses as it does
  elsewhere, which leaves room for the label column plus about three beat
  columns.
- **Below 1024px it is read-only.** A banner reads "View only — open nudo on
  a larger screen to edit the plot." (mockup page 10). Add, menus and drag
  are not rendered. Cards still open the editor, but its fields are
  read-only.
- What stays visible: plotline labels (sticky), beat headers, card titles,
  and descriptions when they are enabled. Connections draw only in Selected
  mode, for the tapped card. Images (PR 10) are hidden below 1024px.

## 20. Tech stack

No new runtime dependencies across all ten PRs. React 19, Vite, React Router
7, TanStack Query 5, Jotai 2, `@dnd-kit/core` and `@dnd-kit/sortable`
(already installed), Tailwind v4, shadcn/ui, `sonner`, PostGraphile,
PostgreSQL, node-pg-migrate. Testing uses Vitest, Testing Library, MSW and
Playwright. Connection rendering is hand-written SVG (§11). If that ever
proves inadequate, adopting a library requires a written comparison and
approval first.

## 21. Code layout

```
apps/web/src/features/plot/
├── api/plot.api.ts
├── plot.types.ts
├── constants/plot.constants.ts            ← widths, palette keys, limits, breakpoint
├── constants/plot-structures.constants.ts ← PR 7
├── lib/plot.utils.ts (+ .test.ts)         ← cells, narrative order, applyCardMove
├── hooks/use-plot.ts, use-plot-mutations.ts, use-plot-view.ts
└── components/
    ├── plot-page.tsx                      ← loading / error / empty / board
    ├── board/{plot-board,plotline-label,beat-header,plot-cell,plot-card,unassigned-tray}.tsx
    ├── card-editor/{card-editor-dialog,card-location,card-manuscript-link,card-connections}.tsx
    ├── connections/connection-layer.tsx   ← PR 6
    ├── overview/…                         ← PR 8
    └── timeline/…                         ← PR 9
```

Code uses the path aliases and `@ui/components/ui/*` first. Comments explain
why, never what.

## 22. Testing (all PRs)

| Layer | Covers |
| --- | --- |
| API integration | CRUD, RLS isolation, cross-project rejection, the owner trigger through generic mutations, reorder and move functions, `RESTRICT` and the delete functions, link `SET NULL`, connection cascade, `create_scene_from_card` atomicity |
| Unit | `plot.utils` (grouping, narrative order, optimistic move maths), palette assignment |
| Web integration (MSW) | Loading/error/empty, Start plot, every menu action, the card editor (save, cancel, discard prompt, delete), rollback and toast on failure, keyboard move, Unassigned flows, link picker, View menu persistence, connection list |
| Accessibility | Keyboard-only path for each flow; focus return; announcements; that colour is never the only cue |
| Storybook | Every new component, in its meaningful states (empty, populated, dense, untitled, dragging, read-only, linked, connected) |
| E2E (small) | (1) start plot → add card → drag to another cell → reload; (2) PR 4: link a card → rename the document → card shows the new title; (3) PR 6: connect two cards → visible in Selected mode |

## 23. Boundaries

- **Always:** keep RLS and owner checks on every new table and function;
  keep Plot data project-scoped; keep cards lightweight.
- **Ask first:** any new dependency (including connector libraries); any new
  card field outside this spec; storing view preferences on the server.
- **Never:** let SQL cascades decide what happens to a writer's ideas,
  except on project or account deletion; copy manuscript titles into Plot;
  move manuscript structure as a side effect of a Plot action; edit
  `packages/ui/src/components/ui/`.

## 24. Out of scope

World-building, series bible, family trees, research manager, location
database, AI generation or critique, infinite canvas, mind mapping, scene
analytics, large card metadata forms.
