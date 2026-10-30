# Tasks: Plot

> Status: In progress — PR 1 (Plot foundation) in review (PR #45 — https://github.com/r41ph/nudo/pull/45)
> Spec: [`plot.md`](./plot.md)
> Plan: [`plot.plan.md`](./plot.plan.md)
> Branch: `feat/plot-tool` (PR 1)

This file covers **PR 1** only. Tasks for later PRs are added when each one
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
