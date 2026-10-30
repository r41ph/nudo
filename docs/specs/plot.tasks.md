# Tasks: Plot

> Status: In progress — PR 1 (Plot foundation) merged (PR #45 — https://github.com/r41ph/nudo/pull/45); PR 2 (Cards and drag and drop) in progress
> Spec: [`plot.md`](./plot.md)
> Plan: [`plot.plan.md`](./plot.plan.md)
> Branches: `feat/plot-tool` (PR 1), `feat/plot-cards` (PR 2)

This file covers **PRs 1 and 2**. Tasks for later PRs are added when each one
starts. Each task can be verified on its own and touches about 5 files or
fewer. Every phase ends with the tests passing.

---

## Phase 1 — Schema

### Task 1.1 — Integration test (red first)

- **Acceptance:** `plot.integration.test.ts` covers:
  - generic create, rename, recolour and delete of plotlines and beats,
    with `user_id` filled from the session and never sent by the client;
  - name CHECKs (empty or whitespace-only, over 120 chars) and the colour
    CHECK (a key outside the palette);
  - `start_plot(project_id)` creates "Main plot" (`blue`) plus Beginning,
    Middle and End at positions 0–2, and is a no-op on a project that
    already has a plotline or a beat;
  - `reorder_plotlines` / `reorder_plot_beats(project_id, ids)` renumber
    densely, and reject an id from another project, a foreign project and a
    list that is not exactly the project's rows;
  - `plot_check_owner` rejects, through the generic mutations, a row whose
    `project_id` belongs to another user and a `project_id` change;
  - RLS: user B can't read, rename, recolour, delete or create plotlines or
    beats in user A's project, and can't call the three functions on it;
  - deleting a project cascades to its plotlines and beats.
- **Verify:** `pnpm test:api:int plot`. It fails because the tables don't
  exist yet.
- **Files:** `apps/api/src/test/plot.integration.test.ts`,
  `apps/api/src/test/seed.ts` (plotline and beat helpers, if shared).

### Task 1.2 — Migration 025

- **Acceptance:**
  - `plotlines` and `plot_beats` per spec §6, each with an index on
    `(project_id, position)`, the four `*_own` policies and an
    `updated_at` touch trigger.
  - `plot_check_owner()` (one shared function, `pg_catalog, public`
    pinned) with a trigger on each table for INSERT and UPDATE of
    `project_id` and `user_id`.
  - `start_plot`, `reorder_plotlines` and `reorder_plot_beats`:
    `SECURITY DEFINER`, `search_path` pinned, each checking that the
    project belongs to the caller.
  - Forward-only, with no `down()`.
- **Verify:** `pnpm test:db:setup`, then `pnpm test:api:int plot` passes.
- **Files:** `apps/api/src/db/migrations/025_plot-foundation.ts`.

---

## Phase 2 — Web data layer

### Task 2.1 — Types, query and fixtures

- **Acceptance:**
  - `plot.types.ts` with `Plotline`, `PlotBeat`, `Plot` and the
    `PlotlineColor` key union.
  - `GET_PLOT($projectId)` returns plotlines and beats ordered by
    `position`. `usePlot(projectId)` on the key `['plot', projectId]`.
  - MSW fixtures gain an empty and a populated plot; the handlers answer
    `GetPlot`.
- **Verify:** `pnpm test:web use-plot`.
- **Files:** `features/plot/plot.types.ts`, `features/plot/api/plot.api.ts`,
  `features/plot/hooks/use-plot.ts` (+ test),
  `test/mocks/{fixtures,handlers}.ts`.

### Task 2.2 — Palette and constants

- **Acceptance:**
  - `--plot-<key>` tokens for the seven keys in light and dark, each
    checked for ≥3:1 contrast against `--background` (values adjusted if
    one fails, and the result noted in the PR).
  - `plot.constants.ts` holds the palette keys, label and column widths,
    `PLOT_EDIT_MIN_WIDTH`, the name limit and the save-error toast id.
  - `nextPlotlineColor(used)` returns the first unused key and cycles once
    all seven are used.
- **Verify:** `pnpm test:web plot.utils`.
- **Files:** `packages/ui/src/tailwind.css`,
  `features/plot/constants/plot.constants.ts`,
  `features/plot/lib/plot.utils.ts` (+ test).

### Task 2.3 — Mutations hook

- **Acceptance:**
  - `usePlotMutations(projectId)` exposes start plot, add, rename,
    recolour, reorder and delete for plotlines and beats.
  - Every structural change is optimistic on `['plot', projectId]`, rolls
    back on error with `toast.error(PLOT_SAVE_ERROR, { id })`, and
    invalidates on settle. Start plot is pessimistic (it fills an empty
    board).
  - Adds send `max + 1` positions from the cache.
- **Verify:** `pnpm test:web use-plot-mutations`.
- **Files:** `features/plot/hooks/use-plot-mutations.ts` (+ test),
  `features/plot/api/plot.api.ts`, `test/mocks/handlers.ts`.

---

## Phase 3 — Route and page

### Task 3.1 — Route and Tools rail

- **Acceptance:**
  - `/project/:projectId/plot` renders `PlotPage` (lazy, like the other
    pages); `plotPath(projectId)` joins the route helpers.
  - The rail's **Timeline** becomes **Plot**, enabled and linked. **Story**
    and **Plot** take their active state (and `aria-current`) from the
    route; Characters stays disabled.
- **Verify:** `pnpm test:web tool-list router`; the tool-list story still
  renders.
- **Files:** `app/routes/router.tsx`, `shared/lib/routes.ts`,
  `features/sidebar/sidebar.constants.ts`,
  `features/sidebar/components/tool-list.tsx` (+ test),
  `packages/ui/stories/tool-list.stories.tsx`.

### Task 3.2 — Page states and Start plot

- **Acceptance:**
  - `PlotPage` shows a skeleton while loading, an error with **Retry**, and
    the empty state from spec §7.2 when the project has no plotlines and no
    beats.
  - **Start plot** shows a pending state, then the board. On failure it
    stays on the empty state and shows the toast.
- **Verify:** `pnpm test:web plot-page`.
- **Files:** `features/plot/components/plot-page.tsx` (+ test),
  `features/plot/components/plot-empty.tsx`.

---

## Phase 4 — Board shell

### Task 4.1 — Grid and header

- **Acceptance:**
  - Header: "Plot" (serif) and the muted summary ("1 plotline · 3 beats ·
    0 cards", singular and plural), with **Add beat** and **Add plotline**
    on the right.
  - Plotlines are rows and beats are columns. The 200px label column
    sticks left and shows the colour dot, name and "0 cards". The beat
    header row sticks to the top. Columns are `PLOT_BEAT_COLUMN_WIDTH`.
    The grid scrolls both ways inside the main area, and the window never
    scrolls sideways.
  - **+ Plotline** sits below the last row. New plotlines take
    `nextPlotlineColor`, new beats are "Untitled beat".
- **Verify:** `pnpm test:web plot-board`.
- **Files:** `features/plot/components/board/plot-board.tsx` (+ test),
  `features/plot/components/board/plot-header.tsx`.

### Task 4.2 — Plotline label and menu

- **Acceptance:**
  - A `⋯` trigger, visible on hover or focus and always in the tab order,
    opens **Rename**, **Colour** (named swatches, current one
    `aria-checked`), **Move up**, **Move down** (disabled at the ends) and
    **Delete plotline**.
  - Rename is inline: commits on blur or Enter, cancels on Escape, and an
    empty value keeps the old name.
  - Delete removes the (always empty) plotline at once, with a toast.
- **Verify:** `pnpm test:web plotline-label`.
- **Files:** `features/plot/components/board/plotline-label.tsx` (+ test),
  `features/plot/components/board/inline-name-input.tsx`.

### Task 4.3 — Beat header and menu

- **Acceptance:** the same pattern as 4.2 with **Rename**, **Move left**,
  **Move right** and **Delete beat**.
- **Verify:** `pnpm test:web beat-header`.
- **Files:** `features/plot/components/board/beat-header.tsx` (+ test).

### Task 4.4 — Read-only below 1024px

- **Acceptance:** below `PLOT_EDIT_MIN_WIDTH` the banner "View only — open
  nudo on a larger screen to edit the plot." shows, and Add, **+ Plotline**
  and every `⋯` menu are not rendered. The labels and headers stay.
- **Verify:** `pnpm test:web plot-board plot-page`.
- **Files:** `features/plot/components/board/plot-board.tsx` (+ test),
  `features/plot/hooks/use-plot-editable.ts`.

### Task 4.5 — Stories

- **Acceptance:** stories for `PlotEmpty`, `PlotlineLabel` (each colour,
  menu open, renaming), `BeatHeader` (menu open, renaming) and the board
  shell (populated, read-only, loading, error).
- **Verify:** `pnpm storybook`; screenshot each state in light and dark.
- **Files:** `packages/ui/stories/plot-*.stories.tsx`.

**PR 1 checkpoint:** push and open the PR. By hand, start a plot, add,
rename, recolour, reorder and delete plotlines and beats, then reload and
see the same board.

### Task 4.6 — Link docs and PR

- **Acceptance:** the `> Status:` lines in the spec, the plan and this file
  name PR 1, and the PR description points at the spec.
- **Files:** `docs/specs/plot{,.plan,.tasks}.md`.

---

# PR 2 — Cards and drag and drop

Commits follow the plan's review order: schema → cards CRUD → card drag and
drop → row/column drag and drop. Migration 026 went to the palette change,
so cards are **027** and the later migrations in the plan move up by one.

## Phase 5 — Schema

### Task 5.1 — Integration test (red first)

- **Acceptance:** `plot-cards.integration.test.ts` covers:
  - generic create, update and delete of cards, with `user_id` filled from
    the session; `title` defaults to `''` and is capped at 200 chars;
    `description` has no limit;
  - the placement CHECK: a plotline without a beat (or the reverse) is
    rejected, both NULL is accepted;
  - `plot_check_owner` rejects a card whose plotline or beat belongs to
    another project, through create and through update;
  - `RESTRICT`: a generic delete of a plotline or beat that has cards
    fails, and succeeds once it is empty;
  - `move_plot_card(card_id, plotline_id, beat_id, ordered_ids)` reorders
    within a cell, moves across cells (destination gets `ordered_ids`'
    order, the source cell is renumbered densely), and rejects: a card,
    plotline or beat from another project or user; an `ordered_ids` that is
    not exactly the destination's cards plus the moved card; a plotline
    without a beat;
  - RLS: user B can't read, create, update, delete or move user A's cards;
  - deleting a project cascades to its cards.
- **Verify:** `pnpm test:api:int plot-cards` fails because the table
  doesn't exist yet.
- **Files:** `apps/api/src/test/plot-cards.integration.test.ts`,
  `apps/api/src/test/seed.ts` (card helper, if shared).

### Task 5.2 — Migration 027

- **Acceptance:**
  - `plot_cards` per spec §6.4: nullable `plotline_id` / `beat_id` with
    `ON DELETE RESTRICT`, the both-or-neither CHECK, the title CHECK, an
    index on `(plotline_id, beat_id, position)`, the four `*_own` policies
    and the `updated_at` touch trigger.
  - `plot_check_owner()` gains the card branch (plotline and beat in the
    row's project) and a trigger on `plot_cards` for INSERT and UPDATE of
    `project_id`, `user_id`, `plotline_id`, `beat_id`.
  - `move_plot_card`: `SECURITY DEFINER`, `search_path` pinned, locks the
    project, checks ownership and the id set, as in 5.1.
  - Forward-only.
- **Verify:** `pnpm test:db:setup`, then `pnpm test:api:int plot` passes
  (PR 1 tests stay green).
- **Files:** `apps/api/src/db/migrations/027_plot-cards.ts`.

---

## Phase 6 — Web data layer

### Task 6.1 — Types, query, fixtures and cell grouping

- **Acceptance:**
  - `PlotCard` type; `GET_PLOT` also returns cards ordered by `position`.
  - MSW fixtures gain cards (including an untitled one and a long one).
  - `plot.utils`: `groupCardsByCell(cards)` keyed by plotline + beat;
    `applyCardMove(cards, cardId, to, index)` returns the new card list
    and the destination `orderedIds`.
- **Verify:** `pnpm test:web plot.utils use-plot`.
- **Files:** `features/plot/plot.types.ts`, `features/plot/api/plot.api.ts`,
  `features/plot/lib/plot.utils.ts` (+ test), `test/mocks/{fixtures,handlers}.ts`.

### Task 6.2 — Card mutations

- **Acceptance:**
  - `createCard`, `updateCard` and `deleteCard` are pessimistic (the editor
    waits for them; spec §16) and return promises the dialog can await.
  - `moveCard` is optimistic via `applyCardMove`, sends `move_plot_card`,
    rolls back with the `PLOT_SAVE_ERROR` toast and invalidates on settle.
  - Creates send `max + 1` within the cell.
- **Verify:** `pnpm test:web use-plot-mutations`.
- **Files:** `features/plot/hooks/use-plot-mutations.ts` (+ test),
  `features/plot/api/plot.api.ts`, `test/mocks/handlers.ts`.

---

## Phase 7 — Cards on the board

### Task 7.1 — Cells, cards and counts

- **Acceptance:**
  - `PlotCell` renders its cards; `PlotCard` per spec §7.1 (serif title,
    2px plotline-colour rule, description clamped to 3 lines, "Untitled
    card" muted italic) and is a button opening the editor.
  - An empty cell shows nothing until hover or `:focus-within`, then the
    dashed **Add card** target; the button is always in the tab order.
    Read-only hides it.
  - Header summary and plotline labels show real card counts.
  - **Delete plotline** / **Delete beat** are disabled on populated rows
    and columns, with the hint "Move or delete its cards first".
- **Verify:** `pnpm test:web plot-board plot-card plotline-label beat-header`.
- **Files:** `features/plot/components/board/{plot-cell,plot-card}.tsx`
  (+ tests), `plot-board.tsx`, `plotline-label.tsx`, `beat-header.tsx`.

### Task 7.2 — Card editor: add and edit

- **Acceptance:**
  - **Add card** opens an empty **Edit card** dialog placed in that cell;
    clicking a card (or Enter on it) opens it filled.
  - The context line shows the plotline dot, plotline name and beat name.
    **Title** is focused on open; **Description (optional)** grows.
  - **Save** shows a pending state; on error the dialog stays open with an
    inline message plus the toast, and the text is kept. **Cancel** and
    closing with unsaved changes ask "Discard changes?".
  - Focus returns to the card or Add card button it came from.
  - Read-only: fields are read-only and Save is hidden.
- **Verify:** `pnpm test:web card-editor-dialog`.
- **Files:** `features/plot/components/card-editor/card-editor-dialog.tsx`
  (+ test), `plot-board.tsx`.

### Task 7.3 — Location and delete

- **Acceptance:**
  - **Location**: Plotline and Beat pickers built on `DropdownMenu` radio
    items (no new package); changing them moves the card on Save.
  - **Delete** confirms inline in the footer ("Delete this card? This
    can't be undone." with **Keep** and **Delete card**).
- **Verify:** `pnpm test:web card-editor-dialog card-location`.
- **Files:** `features/plot/components/card-editor/card-location.tsx`
  (+ test), `card-editor-dialog.tsx`.

---

## Phase 8 — Drag and drop

### Task 8.1 — Cards

- **Acceptance:**
  - One `DndContext` on the board, a `SortableContext` per cell; drag to
    reorder within a cell or move across cells, saved through `moveCard`.
  - The source becomes a faded ghost; the target cell is tinted with the
    accent and outlined.
  - `KeyboardSensor` (Space picks up, arrows move, Space drops, Escape
    cancels) with announcements such as "Picked up card 'X' in Main plot,
    Middle".
  - A failed move rolls back and toasts. Read-only renders no drag.
- **Verify:** `pnpm test:web plot-board-dnd plot.utils`.
- **Files:** `features/plot/components/board/{plot-board,plot-cell,plot-card}.tsx`,
  `features/plot/lib/plot-dnd.ts` (announcements, collision helpers, +
  test).

### Task 8.2 — Plotline rows and beat columns

- **Acceptance:** drag a row by its label or a column by its header, saved
  through the PR 1 reorder mutations; keyboard and announcements as in
  8.1; the Move menu items keep working.
- **Verify:** `pnpm test:web plot-board-dnd plotline-label beat-header`.
- **Files:** `plot-board.tsx`, `plotline-label.tsx`, `beat-header.tsx`,
  `plot-dnd.ts`.

---

## Phase 9 — Stories, E2E and docs

### Task 9.1 — Stories

- **Acceptance:** `PlotCard` (default, untitled, long, dragging),
  `CardEditorDialog` (add, edit, delete confirm, saving, error, read-only)
  and the page (populated with cards, dense, read-only). Screenshotted in
  light and dark.
- **Files:** `packages/ui/stories/plot-*.stories.tsx`.

### Task 9.2 — E2E #1

- **Acceptance:** start plot → add a card → drag it to another cell →
  reload → it is still there.
- **Verify:** `pnpm test:e2e plot`.
- **Files:** `e2e/tests/plot.spec.ts`.

**PR 2 checkpoint:** push and open the PR. By hand: add, edit, move (mouse,
keyboard and Location) and delete cards; reload and see the same board.

### Task 9.3 — Link docs and PR

- **Acceptance:** the `> Status:` lines in the spec, the plan and this file
  name PR 2, and the PR description points at the spec.
- **Files:** `docs/specs/plot{,.plan,.tasks}.md`.
