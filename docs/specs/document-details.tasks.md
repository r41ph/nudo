# Tasks: Document Details Inspector

> Status: Draft — awaiting review
> Spec: [`document-details.md`](./document-details.md)
> Plan: [`document-details.plan.md`](./document-details.plan.md)
> Branch: `feat/document-details`

Each task is independently verifiable and touches ~5 files or fewer. Phases end
green and are shippable on their own. "AC n" refers to the spec's
[acceptance criteria](./document-details.md#acceptance-criteria-given--when--then).

Tests first for logic (save hook, suggestions hook, migration); component tests
alongside the component.

---

## Phase 1 — Word-count strip

### Task 1.1 — Move and extend the counts component

- **Acceptance:** `features/document/components/word-count-strip.tsx` exports
  `WordCountStrip` rendering three labelled numbers — `<n> document`,
  `<n> today`, `<n> total` — right-aligned, `text-[11.5px] tabular-nums`,
  numbers `text-prose font-semibold`, labels `text-muted-foreground`,
  `aria-live="off"`. `document` uses the live count when it belongs to the
  current document, else `currentDocument.wordCount`. No `sidebar` import
  remains in the file. (AC 1, 2)
- **Verify:** `pnpm test:web word-count-strip`
- **Files:** `features/document/components/word-count-strip.tsx` (moved from
  `features/sidebar/components/word-counts.tsx`), its `.test.tsx`,
  `packages/ui/stories/word-count-strip.stories.tsx` (renamed).

### Task 1.2 — Mount it, drop it from the sidebar

- **Acceptance:** the strip renders as a sibling of `<main>`, `sticky bottom-0`,
  `pr-[26px]` so it lines up with the top bar's button rather than the text
  column, and stays visible in focus mode. `SidebarFooterActions` no longer
  renders any count. (AC 1, 3)
- **Verify:** `pnpm test:web word-count-strip sidebar-footer-actions`; eye in
  `pnpm dev` that the strip sits bottom-right of the text column and does not
  overlap prose.
- **Files:** `layouts/document-layout.tsx`,
  `features/sidebar/components/sidebar-footer-actions.tsx` (+ its test).

---

## Phase 2 — Schema + API

### Task 2.1 — Integration test (red first)

- **Acceptance:** `document-details.integration.test.ts` covers: `create_node`
  defaults both columns to `''`; a 50,000-char summary round-trips; `pov` at 121
  chars is rejected; `updated_at` advances on a `title`/`status`/`summary`/`pov`
  patch and **does not** on a `position`-only patch; user B can neither read nor
  patch user A's `summary` (negative control, `getTestPool()`). (AC 25–28)
- **Verify:** `pnpm test:api:int` — fails for the right reason (no columns yet).
- **Files:** `apps/api/src/test/document-details.integration.test.ts`.

### Task 2.2 — Migration 023

- **Acceptance:** `summary text NOT NULL DEFAULT ''` (no length constraint),
  `pov text NOT NULL DEFAULT '' CHECK (char_length(pov) <= 120)`, and
  `documents_touch_updated_at` as `BEFORE UPDATE OF title, status, summary, pov`
  — same `LANGUAGE plpgsql` + `SET search_path = pg_catalog, public` style as
  `documents_check_parent` in `022`. Forward-only, no `down()`.
- **Verify:** `pnpm db:migrate` then `pnpm test:api:int` green.
- **Files:** `apps/api/src/db/migrations/023_document-details.ts`.

### Task 2.3 — GraphQL documents and mocks

- **Acceptance:** `GET_DOCUMENT` requests `kind status summary pov`;
  `GET_OUTLINE` requests `pov`; `UPDATE_DOCUMENT_DETAILS` patches via
  `updateDocumentById` and returns `id title status summary pov updatedAt`.
  Fixtures carry the new fields and an `UpdateDocumentDetails` MSW handler
  exists. `DocumentDetails` type added.
- **Verify:** `pnpm typecheck`; `pnpm test:web document-page` still green.
- **Files:** `features/document/api/document.api.ts`,
  `shared/api/outline.api.ts`, `features/document/document.types.ts`,
  `test/mocks/{fixtures,handlers}.ts`.

---

## Phase 3 — Inspector shell (push mode only)

### Task 3.1 — Primitives and icons

- **Acceptance:** `tabs` and `textarea` added via
  `npx shadcn@latest add tabs textarea` from `packages/ui` (files left exactly as
  generated); `info` and `x` registered in the icon registry.
- **Verify:** `pnpm typecheck`; `pnpm storybook` renders an existing story.
- **Files:** `packages/ui/src/components/ui/{tabs,textarea}.tsx`,
  `packages/ui/src/components/icon/icon.tsx`.
- **Status:** done. The blocker was shadcn's registry switching to the `cn`
  package on 2026-09-22; PR #40 adopted it, after which the CLI generated both
  files unmodified.

### Task 3.2 — Make the `matchMedia` mock query-aware

- **Acceptance:** `test/setup.ts` answers `matches` per query instead of always
  `false`, defaults to desktop (`min-width` queries match), and its
  `addEventListener`/`removeEventListener` actually register listeners so a test
  can simulate a viewport change. The theme hook still resolves to light.
- **Verify:** `pnpm test:web` — no existing test regresses.
- **Files:** `apps/web/src/test/setup.ts`.

### Task 3.3 — Panel state

- **Acceptance:** `shared/state/panels.atom.ts` exports `inspectorAtom`
  (`{ isOpen, collapsed, tab }`) and `outlineOpenAtom`, both unpersisted; the
  atoms contain no viewport logic.
- **Verify:** `pnpm test:web panels.atom`
- **Files:** `shared/state/panels.atom.ts` (+ `.test.ts`).

### Task 3.4 — `DocumentInspector` shell

- **Acceptance:** the panel's contents (the host in 3.6 supplies the
  `<aside aria-label="Document details">` container): the Details / Notes tab
  strip (Notes `disabled`, `title="Notes aren't available yet"`), a close
  button (`aria-label="Close details"`), Escape that calls `preventDefault()`,
  focus moved in on an explicit open only (not on a document-switch remount)
  and restored on close, the read-only Created / Updated timestamps, and the
  separator state. Does not write `saveStatusAtom`. No loading or load-error
  state: the panel only mounts with a loaded document (see the spec's
  [States](./document-details.md#states) note). (AC 16)
- **Status:** done.
- **Verify:** `pnpm test:web document-inspector`
- **Files:** `features/document/components/document-inspector.tsx` (+ test),
  `features/document/constants/inspector.constants.ts`.

### Task 3.5 — Details menu item and plumbing

- **Acceptance:** **Details** is the second item in `RowMenu`, directly after
  **Rename**, using the same `ITEM` class and the existing deferred
  `onCloseAutoFocus` mechanism so focus reaches the panel rather than snapping
  back to the `⋯` trigger. `onOpenDetails(id)` is threaded through `OutlineRow`,
  `OutlineTree`, `OutlineTreeCallbacks` and implemented in `DraftSection`
  (navigate to `/document/:id`, then open). Separators still have no menu.
  (AC 4, 6)
- **Verify:** `pnpm test:web row-menu outline-row draft-section`
- **Files:** `features/outline/components/row-menu.tsx`, `outline-row.tsx`,
  `outline-tree.tsx`, `outline-tree.types.ts`,
  `features/sidebar/components/sections/draft-section.tsx`.

### Task 3.6 — Mount in the document layout

- **Acceptance:** the panel renders beside the editor column at
  `INSPECTOR_WIDTH` (336px), keyed by `doc.id` so a document switch remounts it;
  the text column stays centred and is never covered; hidden in focus mode with
  `isOpen` preserved; re-selecting Details keeps it open and refocuses Title.
  (AC 5, 7, 17, 19, 20)
- **Verify:** `pnpm test:web document-layout document-inspector`; eye at 1440px.
- **Files:** `layouts/document-layout.tsx`,
  `features/document/components/inspector-host.tsx`.
- **Status:** done. `InspectorHost` renders a sticky `<aside>` beside the
  editor column (push mode at every width for now; phase 5 adds the off-canvas
  branch below 1280px), and `DocumentPage` passes the loaded document through
  `DocumentLayout`. The return-focus target moved inside `DocumentInspector`:
  the host also remounts when `DocumentPage` shows its loading state, so a
  host-owned ref would survive some switches and not others.

### Task 3.7 — Stories for the shell

- **Acceptance:** `row-menu.stories.tsx` gains the Details item;
  `document-inspector.stories.tsx` covers document, folder and separator (no
  loading or load-error state exists to show).
- **Verify:** `pnpm storybook`
- **Files:** `packages/ui/stories/{row-menu,document-inspector}.stories.tsx`.
- **Status:** done. RowMenu `MenuOpen` shows Details; `DocumentInspector`
  covers document, folder and separator; checked in a real browser via
  Playwright against the mockup header.

---

## Phase 4 — Details form + saves

### Task 4.1 — Save hook tests (red first)

- **Acceptance:** specs for Title committing on blur/Enter only when trimmed and
  changed (empty restores), Status saving immediately, Summary and POV debounced
  1000ms into a single patch, flush on unmount, an error keeping the dirty value,
  and Retry resending the same patch. MSW handlers, not a mocked client.
  (AC 9–12, 14)
- **Verify:** `pnpm test:web use-document-details-save` — red.
- **Files:** `features/document/hooks/use-document-details-save.test.ts`.
- **Status:** done (red first: 15 tests failed on the missing module).

### Task 4.2 — Save hook

- **Acceptance:** green. Refs + timer shape borrowed from `useAutoSave`;
  `onSuccess` merges **only** `title/status/summary/pov/updatedAt` into
  `['document', id]`, then invalidates `['outline']` and `['documents']`;
  `onError` keeps the value, surfaces `Couldn't save` + Retry and
  `toast.error(…, { id: 'inspector-save-error' })`. Local status only.
  (AC 13, 14)
- **Verify:** `pnpm test:web use-document-details-save`
- **Files:** `features/document/hooks/use-document-details-save.ts`.
- **Status:** done. The save is a plain function rather than `useMutation`,
  so the unmount flush completes after the panel is gone (its failure toast
  lives there too). Saves are chained so they reach the server in order, and
  only the newest one settles `saveState`. Two tests cover those, each checked
  to fail when its mechanism is removed.

### Task 4.3 — POV suggestions hook

- **Acceptance:** derives options from the `['outline']` cache: drops empty and
  whitespace values, dedupes case-insensitively keeping the most-used spelling,
  orders by use count then alphabetically, caps at `POV_SUGGESTION_LIMIT` (50),
  returns `[]` on a cold cache. (AC 13, 14 of the POV group)
- **Verify:** `pnpm test:web use-pov-suggestions`
- **Files:** `features/document/hooks/use-pov-suggestions.ts` (+ `.test.ts`).
- **Status:** done. `povSuggestions` is a pure function (7 unit tests);
  `usePovSuggestions` subscribes to the shared `['outline']` query with a
  module-level `select`, so it costs no extra request and refreshes when a
  save invalidates the outline.

### Task 4.4 — The form

- **Acceptance:** Title `Input`; Status as a `DropdownMenu` trigger styled like a
  field, content = the existing `StatusMenuItems` (no `Select` added); Summary as
  an auto-growing `Textarea` with no `maxLength` and no counter; POV as an
  `Input` with `maxLength={POV_MAX}` + `list="inspector-pov-options"` and a
  sibling `<datalist>`, **rendered only when `kind === 'document'`**;
  Created/Updated as a `<dl>` of `<time dateTime>`; a `role="status"` line. No
  Labels field, no word count. (AC 8)
- **Verify:** `pnpm test:web document-inspector`
- **Files:** `features/document/components/document-inspector-details.tsx`.
- **Status:** done. `StatusDot` / `StatusMenuItems` / `STATUS_LABELS` (plus a
  new `EmptyStatusDot`) moved from `features/outline` to
  `shared/components/status-menu.tsx` first, so the document feature doesn't
  import another feature's internals. The save line is its own component
  (`DetailsSaveStatus`) so its states have a story. A default `GetOutline` MSW
  handler was added, since the panel now subscribes to the outline. Checked in
  a browser via Playwright against the mockup.

### Task 4.4b — Reflect outline edits in an open panel (found during 4.4)

- **Gap:** renaming or setting status from the row menu while the panel is
  open leaves the panel (and `DocumentPage`'s `['document', id]` cache)
  stale: `DraftSection` invalidates only `['outline']` and `['documents']`.
  The spec's Conflicts section expects the Title field to take the server
  value when it isn't dirty.
- **Acceptance:** an outline rename or status change shows up in an open
  panel within one refetch; a Title field being edited is not overwritten.
- **Files:** `features/sidebar/components/sections/draft-section.tsx`,
  `features/document/hooks/use-document-details-save.ts` (+ tests).
- **Approach (planned, not started):**
  1. In `DraftSection`, make the rename and set-status mutations also
     invalidate `['document', id]` for the node they touched, so
     `DocumentPage` refetches and passes fresh `details` down. A refetch
     doesn't re-seed the editor (`MainEditor` only reads `initialContent` on
     mount), and window-focus refetches already do the same.
  2. In `useDocumentDetailsSave`, when `details.title` / `details.status`
     change, adopt them unless that field has unsaved local edits (Title:
     local value differs from `savedTitleRef`). Prefer React's
     "adjust state when a prop changes" pattern over an effect, as
     `SaveBar` / `DetailsSaveStatus` already do; check the repo's
     react-hooks lint rules before choosing.
  3. Tests first: hook test for adopting a server title when not dirty and
     keeping a dirty one; `draft-section` test that a rename invalidates
     the document query.
- **Status:** done, as planned, with two changes. `savedTitleRef` became
  state, because the render-time check reads it and the react-hooks `refs`
  rule forbids reading refs during render. Status has the same guard as Title:
  a save landing while a newer local status is pending would otherwise flip
  the select back for a moment.

### Task 4.5 — Flush on exit paths

- **Acceptance:** pending debounced writes flush on close, on document switch
  (unmount) and on `pagehide`; a flush failing after unmount still toasts.
  (AC 15)
- **Verify:** `pnpm test:web document-inspector use-document-details-save`
- **Files:** `features/document/hooks/use-document-details-save.ts`,
  `features/document/components/document-inspector.tsx`.
- **Status:** done, with tests only. Tasks 4.3 and 4.4 had already built
  every exit path: closing (Close or Escape) and focus mode unmount the panel
  through `InspectorHost`, a document switch remounts it because it is keyed
  by id, and the hook flushes on unmount and on `pagehide`. New
  `inspector-host.test.tsx` covers close and switch end to end, using a wait
  shorter than the debounce so only a flush can pass. A hook test covers a
  failed flush after unmount still toasting. Collapsing below 1280px keeps the
  panel mounted, so it needs its own flush in phase 5.

### Task 4.6 — Integration tests and stories

- **Acceptance:** AC 8–18 covered in `document-inspector.test.tsx`, including the
  folder case (no POV field) and the `<datalist>` contents. Stories for saving,
  saved, error, folder, POV with suggestions and POV with none.
- **Verify:** `pnpm test:web document-inspector`; `pnpm storybook`
- **Files:** `features/document/components/document-inspector.test.tsx`,
  `packages/ui/stories/document-inspector.stories.tsx`.
- **Status:** done. The field tests live in `document-inspector-details.test.tsx`
  (where 4.4 put them), not `document-inspector.test.tsx`. Added AC 10, a
  first status (11), a picked suggestion (13), first POV offered once saved
  (14), Updated from the server (15), and the toast with kept text (16); AC 17
  and 18 were already covered by 4.3 and 4.5. The save hook writes to the
  app's singleton `queryClient`, so `renderWithProviders` now takes an
  optional `queryClient` and these tests pass that one. Stories: Saving, Saved
  and SaveFailed answer the save by stubbing `fetch` in a story `beforeEach`;
  Storybook now defines a placeholder `VITE_API_URL`, since an undefined one
  made the client throw before any request. PovWithSuggestions and
  PovWithNoSuggestions join the existing Folder story.

---

## Phase 5 — Responsive collapse + motion

### Task 5.1 — `useMediaQuery`

- **Acceptance:** returns the correct value on first render (lazy
  `useState(() => window.matchMedia(query).matches)`), subscribes to changes, and
  cleans up. `use-mobile.ts` is not modified.
- **Verify:** `pnpm test:web use-media-query`
- **Files:** `apps/web/src/shared/hooks/use-media-query.ts` (+ `.test.ts`).

### Task 5.2 — `SidePanel` wrapper

- **Acceptance:** one component for both sides: `fixed inset-y-0`, width from a
  prop, `border-r`/`border-l` by side, `translate-x` when collapsed, `inert`
  while collapsed so its fields leave the tab order, and a
  `motion-safe:transition-transform` of `PANEL_MOTION_MS` (180ms) that is
  absent under `prefers-reduced-motion`. Below 768px it takes
  `min(width, 85vw)`. (AC 22)
- **Verify:** `pnpm test:web side-panel`
- **Files:** `shared/components/side-panel.tsx` (+ test).

### Task 5.3 — `usePanels`

- **Acceptance:** the only place that combines viewport and panel state: above
  1280px `collapsed` is ignored and both toggles are absent; below it, opening
  one panel collapses the other, and growing past 1280px shows whatever was
  collapsed (derived, so shrinking back restores the narrow layout). Collapse
  keeps `isOpen`; close clears it. Mutual exclusion itself lives in the write
  atoms (see plan §D).
- **Verify:** `pnpm test:web use-panels`
- **Files:** `shared/hooks/use-panels.ts` (+ test).

### Task 5.4 — Wrap the left sidebar

- **Acceptance:** below 1280px `WorkspaceLayout` renders `AppSidebar` inside
  `SidePanel`; at or above it, the current sticky flex child is unchanged.
  `AppSidebar` keeps `collapsible="none"` and is otherwise untouched.
- **Verify:** `pnpm test:web workspace-layout`; eye at 1440 / 1280 / 1024.
- **Files:** `layouts/workspace-layout.tsx`.
- **Status:** done. The panel is labelled "Outline" with id `OUTLINE_PANEL_ID`
  (`sidebar.constants.ts`), ready for 5.5's `aria-controls`. Its width is
  `SIDEBAR_WIDTH`. The layout root gained `flex-1`, because the h-svh sidebar
  column had been the only thing holding the page at full height. Without it,
  below 1280px the word-count strip rose to the end of the text. Checked in the real app at 1440 / 1280 / 1024, since no
  story covers this layout.

### Task 5.5 — Toggles

- **Acceptance:** two ghost icon buttons in `EditorTopBar`, rendered **only**
  below 1280px, each with `aria-expanded` and `aria-controls`, labelled
  "Show/Hide outline" and "Show/Hide details". The inspector's appears only while
  `isOpen`, so there is still no persistent Details button. (AC 23)
- **Verify:** `pnpm test:web editor-top-bar`
- **Files:** `features/document/components/editor-top-bar.tsx` (+ test).
- **Status:** done. Not in the spec: both toggles are hidden in focus mode,
  since neither panel renders there and the toggle would control nothing. The
  panel ids moved to `shared/constants/panels.constants.ts` (the top bar is in
  `document` and may not import from `sidebar`), and the inspector's `<aside>`
  now carries `INSPECTOR_PANEL_ID`. New `panelLeft` / `panelRight` icons. The
  outline toggle sits at the left of the bar, and the details toggle sits beside
  focus mode. Expanded and collapsed look the same; only the label and
  `aria-expanded` change. Stories: four `Narrow*` states on the `tablet`
  viewport.

### Task 5.6 — Scrim and mode switch

- **Acceptance:** below 1280px an open panel gets a scrim whose click
  **collapses** (never closes); `InspectorHost` switches between push and
  off-canvas on the breakpoint; nothing above 1280px changes. (AC 21, 23)
  Collapsing flushes pending text: the panel stays mounted, so the unmount
  flush doesn't run (added during 4.5).
- **Verify:** `pnpm test:web document-layout inspector-host`
- **Files:** `features/document/components/inspector-host.tsx`,
  `shared/components/side-panel.tsx`.

### Task 5.7 — Layout tests

- **Acceptance:** `document-layout.test.tsx` asserts both modes via the
  query-aware `matchMedia` mock: no toggles at ≥1280px, both behaviours below,
  opening one panel collapsing the other, strip present and inspector absent in
  focus mode. (AC 3, 19–23)
- **Verify:** `pnpm test:web document-layout`
- **Files:** `layouts/document-layout.test.tsx`.

---

## Phase 6 — E2E

### Task 6.1 — Persist-across-reload journey

- **Acceptance:** one spec mirroring `edit-persist.spec.ts`: log in → `⋯` →
  Details → type a Summary → await the `updateDocumentById` response → reload →
  reopen Details → the Summary is there.
- **Verify:** `pnpm test:e2e` with Docker up.
- **Files:** `e2e/tests/document-details.spec.ts`.

---

## Phase 7 — Close-out

### Task 7.1 — Link the docs to the PR

- **Acceptance:** spec, plan and tasks flip to
  `> Status: Implemented (PR #NN — <url>)`, committed into the same PR; the PR
  description points at `Spec: docs/specs/document-details.md`. `CLAUDE.md` is
  updated only if a command or convention changed (none expected).
- **Verify:** read-through; `pnpm typecheck` and the full changed-file test
  filters green.
- **Files:** `docs/specs/document-details{,.plan,.tasks}.md`.
