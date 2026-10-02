# Spec: Document Details Inspector

> Status: Implemented (PR #41 — https://github.com/r41ph/nudo/pull/41)
> Branch: `feat/document-details`

## Objective

Give a writer a lightweight right-hand **inspector** to view and edit a
document's metadata (title, status, summary, POV, timestamps) without adding
permanent controls to the writing surface, and move the word counts out of the
manuscript sidebar to an unobtrusive strip at the bottom-right of the writing
area.

The mockups in this brief are **design intent, not styling**: the panel is
built from the existing tokens, spacing, radii and components. The editor stays
the visual priority.

### User flow

1. The writer hovers or focuses a document row in the outline and opens its
   `⋯` menu (`RowMenu`).
2. They pick **Details** (directly after **Rename**). If the row is not the
   document currently open, the app navigates to it first.
3. A right-hand inspector opens beside the editor, on the **Details** tab, with
   focus on the **Title** field. The text column narrows but stays centred.
4. They edit Title / Status / Summary / POV. Title commits on blur or Enter,
   Status on selection, Summary and POV autosave after a short pause. A quiet
   status line in the panel reads _Saving… → Saved_, or _Couldn't save — Retry_
   on failure.
5. Clicking another document in the outline keeps the panel open and swaps its
   contents (pending edits are flushed first).
6. They close it with the panel's close button or **Escape**; focus returns to
   where it was.
7. Throughout, the bottom-right of the writing area shows
   `45 document · 0 today · 54 total`; word counts never appear in the sidebar
   or the inspector.

### Success criteria

- [ ] The `WordCounts` block is gone from the sidebar footer; an equivalent
      strip with the labels **document**, **today**, **total** sits at the
      bottom-right of the writing area (also in focus mode).
- [ ] `RowMenu` on document and folder rows has a **Details** item directly
      after **Rename**.
- [ ] **Details** opens the inspector for the route's document; if the row's
      document is not the active one, the app navigates to it and opens.
- [ ] The Details tab shows Title, Status, Summary, POV (documents only) and
      read-only Created / Updated. No Labels field, no word count.
- [ ] The Notes tab is present but disabled (see [Notes tab](#notes-tab)).
- [ ] Edits persist through the existing GraphQL/PostGraphile path and survive
      a reload; failures are surfaced in the panel and via toast.
- [ ] Closes via the close button and Escape; focus is restored.
- [ ] Switching documents updates the inspector in place.
- [ ] At ≥1280px the panel pushes the editor (never covers text) and the left
      sidebar is always visible; below 1280px both panels collapse, each with a
      toggle, and they are mutually exclusive.
- [ ] Animation is ≤200ms and disabled under `prefers-reduced-motion`.
- [ ] Empty Summary/POV never block writing or document creation.

## Affected surfaces (found in the repo)

| Area                 | File(s)                                                                                                               | Change                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Sidebar footer       | `apps/web/src/features/sidebar/components/sidebar-footer-actions.tsx`                                                 | Drop `<WordCounts />`                                                                                               |
| Word counts          | `apps/web/src/features/sidebar/components/word-counts.tsx` (+ `.test.tsx`, `packages/ui/stories/word-counts.stories`) | **Move** to `features/document/components/word-count-strip.tsx`. Today it imports `document` internals from `sidebar`, which the frontend rule forbids — the move fixes that. |
| Row menu             | `apps/web/src/features/outline/components/row-menu.tsx`                                                               | Add **Details** item after Rename; new `onOpenDetails` prop                                                         |
| Outline plumbing     | `outline-row.tsx`, `outline-tree.tsx`, `outline-tree.types.ts` (`OutlineTreeCallbacks`), `sections/draft-section.tsx` | Thread `onOpenDetails(id)` through to `DraftSection`, which navigates + opens                                        |
| Responsive shell     | `apps/web/src/layouts/workspace-layout.tsx`, `shared/components/side-panel.tsx` (new), `apps/web/src/shared/hooks/use-media-query.ts` (new)              | Below 1280px both panels slide off-canvas through one shared wrapper, each with a toggle; above 1280px nothing changes             |
| Document layout      | `apps/web/src/layouts/document-layout.tsx`                                                                            | Render editor column + inspector side by side; host the word-count strip                                            |
| Document page/query  | `features/document/components/document-page.tsx`, `api/document.api.ts` (`GET_DOCUMENT`)                             | Fetch `kind status summary pov`; add `UPDATE_DOCUMENT_DETAILS` mutation                                             |
| POV suggestions      | `apps/web/src/shared/api/outline.api.ts` (`GET_OUTLINE`), `features/document/hooks/use-pov-suggestions.ts` (new)                | `GET_OUTLINE` gains `pov`; the `<datalist>` options are derived from the cached outline — no new request, no new entity            |
| Shared state         | `apps/web/src/shared/state/inspector.atom.ts` (new)                                                                   | `{ isOpen, tab }` — opened from `sidebar`, rendered by `document`, so it lives in `shared/` per the feature-boundary rule |
| Data entity          | `documents` table (`apps/api/src/db/migrations/023_document-details.ts`, new)                                         | `summary`, `pov` columns; `updated_at` touch trigger                                                                |
| UI primitives        | `packages/ui/src/components/ui/{tabs,textarea}.tsx` (new, via `npx shadcn@latest add tabs textarea`)                  | shadcn-managed; do not edit                                                                                          |
| Icon registry        | `packages/ui/src/components/icon/icon.tsx`                                                                            | Register `info` (lucide `Info`) for the Details item and `x` for close                                              |
| Test mocks           | `apps/web/src/test/mocks/{fixtures,handlers}.ts`                                                                      | Add `kind/status/summary/pov` to document fixtures; `UpdateDocumentDetails` handler                                  |

Not touched: `plate-editor` / `MainEditor`, the toolbar dialog, the top bar,
`discussions`, `document_versions`, the outline tree's DnD.

## Tech Stack

No new runtime dependencies beyond two shadcn primitives.

- React 19 + Vite, React Router 7, TanStack Query 5, Jotai 2 (`apps/web`)
- Tailwind v4 + shadcn/ui (`packages/ui`); Radix `Tabs` and shadcn `Textarea`
  added via the CLI
- `sonner` toasts (already used for outline mutation errors)
- PostGraphile over PostgreSQL; `node-pg-migrate` forward-only migrations
- Vitest + Testing Library + MSW (web), Vitest + supertest (API), Playwright
  (`e2e/`)

## Commands

```bash
pnpm dev                                   # Postgres + api + web
pnpm db:migrate                            # apply 023 (needs pnpm docker:up)
pnpm test:web word-count-strip inspector   # web unit + integration, filtered
pnpm test:api:int                          # API integration (docker:up + test:db:setup once)
pnpm test:e2e                              # Playwright, only if the e2e slice is built
pnpm storybook                             # stories for the new components
pnpm typecheck                             # what the pre-push hook runs
npx shadcn@latest add tabs textarea        # run from packages/ui
```

## Project Structure

```
apps/api/src/db/migrations/
└── 023_document-details.ts                        ← summary, pov, updated_at trigger
apps/api/src/test/
└── document-details.integration.test.ts           ← GraphQL + RLS + trigger + CHECK

apps/web/src/shared/state/
└── inspector.atom.ts                              ← isOpen / tab (+ .test.ts)
apps/web/src/features/document/
├── api/document.api.ts                            ← GET_DOCUMENT fields, UPDATE_DOCUMENT_DETAILS
├── document.types.ts                              ← DocumentDetails type
├── constants/inspector.constants.ts               ← INSPECTOR_WIDTH, breakpoint, debounce, POV limits
├── components/
│   ├── word-count-strip.tsx (+ .test.tsx)         ← moved from sidebar
│   ├── document-inspector.tsx (+ .test.tsx)       ← shell: tabs, header, close, states
│   ├── document-inspector-details.tsx             ← the form
│   └── inspector-host.tsx                         ← push vs off-canvas by viewport, scrim, toggle
├── hooks/
│   └── use-document-details-save.ts (+ .test.ts) ← per-field save + debounce + flush
│   └── use-pov-suggestions.ts (+ .test.ts)     ← distinct POV labels from the outline cache
apps/web/src/layouts/document-layout.tsx           ← editor column | inspector
apps/web/src/layouts/workspace-layout.tsx          ← wraps AppSidebar in <SidePanel>
apps/web/src/shared/components/side-panel.tsx      ← off-canvas wrapper, both sides
apps/web/src/shared/hooks/use-media-query.ts       ← synchronous matchMedia hook
packages/ui/stories/
├── word-count-strip.stories.tsx
├── document-inspector.stories.tsx
└── row-menu.stories.tsx                           ← add the Details item state
```

## Component / state architecture

```
DocumentPage ─ useQuery(['document', id]) ─────────────┐
   └─ DocumentLayout                                    │ same cache key,
        ├─ EditorTopBar                                 │ deduped by TanStack
        ├─ <div class="flex flex-1">                    │
        │    ├─ editor column  ── MainEditor            │
        │    │                  └─ WordCountStrip       │
        │    └─ InspectorHost (reads inspectorAtom) ────┘
        │         └─ DocumentInspector key={doc.id}
        │              ├─ Tabs: Details | Notes(disabled)
        │              └─ DocumentInspectorDetails ── useDocumentDetailsSave(id)
DraftSection ── RowMenu.onOpenDetails ─► navigate(`/document/${id}`) + set inspectorAtom
```

- **`inspectorAtom`** (`shared/state/inspector.atom.ts`):
  `atom<{ isOpen: boolean; collapsed: boolean; tab: 'details' | 'notes' }>`,
  defaulting to `{ isOpen: false, collapsed: false, tab: 'details' }`. Not
  persisted; a reload starts closed. `collapsed` only means anything below
  1280px ([Layout](#layout)).
- **Which document?** Always the route's `:id`. The inspector never carries its
  own document id, so "switching documents" is free: `DocumentInspector` is
  keyed by `doc.id`, remounts with fresh form state, and its unmount cleanup
  flushes any pending debounced save for the previous id.
- **Reused primitives**: `Tabs` (new shadcn), `Input`, `Label`, `Textarea`
  (new shadcn), `Button`, `Skeleton`, `DropdownMenu` +
  `StatusMenuItems`/`StatusDot` (existing, so the inspector's Status control
  cannot drift from the row menu's), `Icon`, `toast`.
- **Status control** is a `DropdownMenu` whose trigger looks like an input
  (mockup: dot + label + chevron) and whose content is `StatusMenuItems`. No
  `Select` component is added.
- **POV** is a plain `Input` in the MVP (see [Data model](#data-model)),
  backed by a `<datalist>` of labels this manuscript already uses (see
  [POV suggestions](#pov-suggestions)). It renders **only for
  `kind === 'document'`** — POV is a scene concept, so a folder's Details tab
  shows Title, Status, Summary and the timestamps, and nothing shifts around.

## Data model

`documents` today: `id, user_id, title, content, plain_text, word_count,
created_at, updated_at, position, parent_id, kind, status`. Status already
exists (`planned | drafting | done | NULL`) and is reused as-is.

Migration `023_document-details.ts` (forward-only):

| Column    | Type   | Default | Constraint                              | Notes                                                                                                             |
| --------- | ------ | ------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `summary` | `text` | `''`    | `NOT NULL` only                          | Free text, **no length limit** — a synopsis is as long as the author needs. `''` (not NULL) keeps controlled inputs trivial and `createNode` untouched. |
| `pov`     | `text` | `''`    | `NOT NULL`, `char_length(pov) ≤ 120`      | Free-text character name for now, suggested from values already used ([POV suggestions](#pov-suggestions)). When a `characters` table exists, add `pov_character_id uuid NULL REFERENCES characters` alongside; `pov` becomes the denormalised fallback label. No rename needed. |

Plus a trigger so metadata edits move the **Updated** timestamp — today
`updateDocumentById` (used by rename and set-status) never touches
`updated_at`; only the SQL functions do:

```sql
CREATE FUNCTION documents_touch_updated_at() RETURNS trigger ... SET NEW.updated_at = now()
CREATE TRIGGER documents_touch_updated_at_trg
  BEFORE UPDATE OF title, status, summary, pov ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_touch_updated_at();
```

Scoped to those four columns on purpose: position/parent writes during a
reorder must not stamp every sibling as "updated".

Backward compatibility: existing rows get `''` via the default; RLS policies on
`documents` cover the new columns automatically; PostGraphile exposes them on
`Document` and in `DocumentPatch` with no API code. `create_node` is unchanged
(new columns take their defaults), so document creation is unaffected.

Client type (`document.types.ts`):

```ts
export interface DocumentDetails {
  id: string;
  title: string;
  kind: NodeKind;
  status: NodeStatus | null;
  summary: string;
  pov: string;
  createdAt: string;
  updatedAt: string;
}
```

Client-side validation mirrors the constraints: Title trimmed, non-empty
(empty → keep previous value, same as `useInlineRename`); Summary `maxLength`
POV `maxLength` 120. Summary is unbounded — no `maxLength`, no counter, and a
`Textarea` that grows with its content. Nothing else is validated: the fields
are prose.

<a id="pov-suggestions"></a>

### POV suggestions

POV stays free text — the writer can always type something new. The `<datalist>`
only offers what this manuscript already uses, so the second scene from Mara's
POV costs one keystroke instead of nine, and "Mara" / "mara" / "Marah" stop
drifting apart before a `characters` table has to reconcile them.

There is **no stored list and no management UI**. The options are derived from
the `pov` values on the user's own documents:

- `GET_OUTLINE` (`shared/api/outline.api.ts`) gains `pov`. It already fetches
  every row for the tree and is already invalidated by an inspector save, so
  suggestions cost no extra request and refresh themselves.
- `usePovSuggestions()` reads the `['outline']` cache, drops empty/whitespace
  values, dedupes case-insensitively (keeping the most-used spelling), orders by
  use count then alphabetically, and caps at `POV_SUGGESTION_LIMIT` (50 — past
  that the popup is worse than typing).
- `<Input list="inspector-pov-options" />` plus a sibling `<datalist>`. `Input`
  is shadcn-managed and spreads its props, so `list` passes through with no edit
  to `packages/ui/src/components/ui/`.

Consequences to accept, not bugs:

- A label exists only while at least one document carries it. Clear the last
  document using "Mara" and "Mara" stops being offered — which is exactly why
  there is nothing to clean up.
- Suggestions are manuscript-wide. Folders have no POV field, so in practice
  the list is built from scene documents only.
- The browser owns the popup's filtering, styling and keyboard. Safari's is
  plainer; a browser without `<datalist>` support shows an ordinary text input.
  Nothing depends on it.
- With the popup open, Escape is swallowed by the browser in some engines and
  reaches the panel in others, closing the inspector. Accepted: the debounced
  save flushes on close, so nothing typed is lost.

When a `characters` table lands, this hook is the seam — it starts reading
characters instead, and the stored `pov` text stays as the fallback label.

## Persistence and autosave

One mutation, a generic patch (no new SQL function; there is no multi-step
logic to make atomic):

```graphql
mutation UpdateDocumentDetails($id: UUID!, $patch: DocumentPatch!) {
  updateDocumentById(input: { id: $id, documentPatch: $patch }) {
    document { id title status summary pov updatedAt }
  }
}
```

`useDocumentDetailsSave(documentId)` owns the write path and mirrors the shape
of `useAutoSave`:

| Field   | Commit rule                                 | Why                                                                  |
| ------- | ------------------------------------------- | -------------------------------------------------------------------- |
| Title   | On blur or Enter, if trimmed and changed    | Same contract as inline rename; the outline row updates on success   |
| Status  | Immediately on selection                    | Discrete value, same as the row menu                                 |
| Summary | Debounced 1000ms after the last keystroke   | Prose; shorter than the editor's 2500ms because the field is small   |
| POV     | Debounced 1000ms                            | Same                                                                 |

- **Status line**: the panel footer shows `Saving…` / `Saved` / `Couldn't save`
  in a `role="status"` region using the SaveBar's vocabulary and colours
  (`text-muted-foreground` / `text-status-done` / `text-destructive`). It does
  **not** write `saveStatusAtom` — that atom is the editor content's, and two
  writers would fight over one label.
- **On success**: `queryClient.setQueryData(['document', id])` with the returned
  fields (same pattern as `useAutoSave`), then
  `invalidateQueries(['outline'])` and `(['documents'])` so the row title/status
  refresh — the same invalidation is what refreshes the POV suggestion list.
- **On error**: keep the local (dirty) value, show `Couldn't save` with a
  **Retry** button in the status line, and `toast.error('Could not save details — try again.', { id: 'inspector-save-error' })`
  matching the outline's toasts. Nothing is swallowed.
- **Flush**: closing the panel, switching documents (unmount) and `pagehide`
  flush pending debounced writes immediately. A flush that fails after unmount
  still toasts (the toast is global).
- **Conflicts**: single-user, last-write-wins. Editor autosave writes only
  `content/plain_text/word_count` (via `update_document_content`); the inspector
  patches only `title/status/summary/pov`. Disjoint columns, and each success
  handler merges only its own fields into the query cache, so neither clobbers
  the other. A rename from the row menu while the inspector is open lands via
  `['outline']` invalidation and the `document` query refetch; the Title input
  takes the server value only when it isn't dirty.
- **Deleted document**: the patch returns `null`/error → treated as an error;
  `DraftSection.navigateAfterRemoval` already moves the route on.

## Interaction rules

**Opening**

- `Details` on the active row → set `inspectorAtom.isOpen = true`, tab
  `details`.
- `Details` on another document/folder row → `navigate(/document/:id)` then
  open. The row's `onOpenDetails(id)` callback does both in `DraftSection`.
- `Details` while already open for the same document → **does not close**. The
  panel stays and focus moves to the Title field. Rationale: the menu item is a
  "go to" command, not a toggle; the panel has its own close button, and a
  toggle from a menu three clicks deep would surprise more than it helps.
- Separators have no `RowMenu` (they use pen/trash buttons) and therefore no
  Details item. Folders get the item; a folder is still a `documents` row.
- On open, focus moves to the **Title** input. The `<aside>` is a named region
  (`aria-label="Document details"`) so screen readers announce entry.
- In focus mode the inspector is **not rendered**; `isOpen` is preserved so
  leaving focus mode brings it back.

**Closing**

- Close button (`aria-label="Close details"`, top-right of the panel).
- **Escape** while focus is anywhere inside the panel. The handler calls
  `preventDefault()` so `DocumentLayout`'s focus-mode listener ignores it (it
  already checks `defaultPrevented`). Escape inside an open Status dropdown
  closes the dropdown only (Radix stops propagation).
- Pending writes are flushed before the state flips.
- **Focus restoration**: on open, the panel records `document.activeElement`
  (after the row menu closes, that is the row's `⋯` trigger). On close it
  focuses that element if still in the DOM, else the editor
  (`[data-slate-editor]`).

**Collapsing (below 1280px only)**

- The top-bar toggle slides the panel off-canvas; `isOpen` stays true, pending
  writes flush, and the toggle remains so one click restores it.
- Clicking the scrim collapses — it does not close.
- Opening the left sidebar collapses the inspector, and opening the inspector
  collapses the left sidebar.
- Growing the viewport past 1280px shows both panels (the inspector if it is
  open) and hides both toggles. Shrinking back restores the narrow layout as
  the writer left it: visibility is derived from the viewport, not written
  back into state.

**Switching documents while open**

- Panel stays open; `DocumentInspector` remounts under the new `key`. Loading
  skeleton shows while `['document', newId]` is fetching. Focus is **not** moved
  into the panel on a switch (the user clicked the outline; leave them there).

**Keyboard inside the panel**

- Tabs follow the Radix roving pattern (arrow keys between tabs; the Notes tab
  is skipped because it is `disabled`).
- Tab order: Details tab → Title → Status trigger → Summary → POV → Retry (only
  when visible) → Close.
- Enter in Title commits; Enter in Summary inserts a newline (it's a
  `<textarea>`); Enter/Space on the Status trigger opens the menu.
- POV's `<datalist>` popup is driven entirely by the browser (arrows to
  choose, Enter to accept). It adds no tab stop.

**Unsaved edits**

- Never block navigation. Debounced fields flush on close/switch/`pagehide`;
  Title commits on blur, which fires before any click elsewhere lands.

## Layout

Widths: left sidebar `295px` (`SIDEBAR_WIDTH`), text column `max-w-[692px]`
with `px-8`, inspector **`336px`** (`INSPECTOR_WIDTH`, 21rem — between the
sidebar and the mockup's ~350px).

Both side panels follow one rule, set by one breakpoint
(`INSPECTOR_PUSH_MIN_WIDTH = 1280`, Tailwind's `xl`):

| Viewport  | Left sidebar                                                                                     | Inspector                                                                                                                | Text column                                       |
| --------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **≥1280** | Always visible, `collapsible="none"` exactly as today. No toggle button.                         | Opened on demand from **Details**. Pushes; never overlays.                                                               | 692px at ≥1440; narrows to ≥585px at 1280         |
| **<1280** | Collapsed by default; slides off-canvas, with a toggle in the editor top bar                       | Opened from **Details**, off-canvas over the page with a scrim; a collapse/expand toggle appears in the top bar while open | Full width whenever both panels are collapsed     |

- Toggle buttons exist **only** below 1280px. Above it the left sidebar needs
  none (it is always there) and the inspector still has no persistent button —
  the row menu remains the only way in, per the brief.
- Below 1280px the two panels are **mutually exclusive**: opening one collapses
  the other. At 1024px, 295 + 336 + 64px of padding would leave a 329px column,
  which is not a text column any more.
- **Collapse ≠ close.** Below 1280px the inspector's toggle slides it off-canvas
  and keeps `isOpen` true, so the toggle stays and one click brings it back. The
  panel's ✕ and Escape *close* it: `isOpen` false, toggle gone, reopen from the
  row menu.
- `inspectorAtom` therefore carries `{ isOpen, collapsed, tab }`. `collapsed` is
  ignored at ≥1280px, so crossing the breakpoint upward shows whatever was
  collapsed without changing state.
- `useMediaQuery('(min-width: 1280px)')` — generalised from
  `packages/ui/src/hooks/use-mobile.ts`, the only responsive hook in the repo —
  is the single source for the mode.
- **No `Sheet`, and no shadcn `collapsible="offcanvas"`.** Both panels share one
  small `SidePanel` wrapper (`fixed inset-y-0` + `translate-x` + `inert` when
  collapsed). `SidebarProvider` keeps a single `open` state for every `Sidebar`
  under it, so two shadcn sidebars could not be toggled independently, and below
  768px `Sidebar` swaps itself for a `Sheet` — neither is wanted here, and
  `packages/ui/src/components/ui/sidebar.tsx` may not be edited. `AppSidebar`
  keeps `collapsible="none"` and simply gets wrapped. Below 768px the panels take
  `min(WIDTH, 85vw)`.

**Scope note.** Making the left sidebar collapse is new work the original brief
did not ask for. It lands in `workspace-layout.tsx` (which already decides
whether the sidebar renders, for focus mode) plus the shared `SidePanel`
wrapper; `AppSidebar` itself is untouched. Small, but it is the one place this
spec reaches outside the document-details feature.

**Mobile note.** The app has no mobile layout today, and this change does not
add one: the only responsive class in `apps/web` is `sm:max-w-150` on the
toolbar dialog. What it guarantees below 768px is that both panels stay
reachable and nothing overlaps unrecoverably. A real mobile layout is separate
work.

**Motion**: 180ms `ease-out` translate on both panels, wrapped in
`motion-safe:`; under `prefers-reduced-motion` they appear and disappear with no
transition. This is the first reduced-motion rule in the repo (none found), so
it lives in `inspector.constants.ts` as the one place to change.

**Word-count strip** is a `sticky bottom-0` sibling of `<main>`, not a child of
the 692px text column: the mockup aligns it with the top bar's focus-mode
button, so it takes the same `pr-[26px]` and sits at the window's right edge.
`text-[11.5px] tabular-nums`, numbers `text-prose font-semibold`, labels `text-muted-foreground`
(not `--faint`: below 13px it fails 4.5:1, as `draft-section.tsx` notes). It is
`aria-live="off"` — it changes on every debounce tick and must not chatter.
Visible in focus mode too (the outline handoff: "keep the count").

<a id="word-count-deferral"></a>**The three counts are moved, not redesigned.**
`today` is currently `useDailyWordDelta`, which is per-document-per-day in
`localStorage`, so it reads "words added to *this* document today" and not the
manuscript-wide total the label implies. `document` also duplicates the count
already shown on the outline row. Both are known and deliberately **out of
scope here**: stage 1 moves the existing block, relabels it to the brief's
`document / today / total`, and adds the `document` number (the sidebar block
showed only two). What the strip should actually *mean* is a separate review. Nothing else in this spec
depends on that answer.

## Accessibility

- Container: `<aside aria-label="Document details">` in both modes — the same
  element, only its positioning changes. Off-canvas (below 1280px) it gets
  `inert` while collapsed so its fields leave the tab order and the
  accessibility tree. Not `aria-hidden`: browsers warn when it hides an element
  that still holds focus, and `inert` already covers it.
- The two toggles below 1280px are `<Button>`s with
  `aria-expanded` and `aria-controls` pointing at their panel, labelled
  "Show outline" / "Hide outline" and "Show details" / "Hide details".
- Tabs: Radix `Tabs` gives `role="tablist"` / `tab` / `tabpanel` and
  `aria-selected`; Notes is `disabled` with visible muted styling and a
  `title="Notes aren't available yet"`.
- Every field has a visible `<Label htmlFor>`; Created/Updated are a
  `<dl>` with `<time dateTime>`.
- Status trigger: `aria-label="Status: Drafting"` / `"Set status"` (same text
  as `NodeStatusControl`), `aria-haspopup="menu"`.
- Save status: `role="status"` (`aria-live="polite"`), so "Saved" and
  "Couldn't save" are announced without stealing focus. The Retry control is a
  real `Button`.
- Focus order and restoration as in [Interaction rules](#interaction-rules).
  Focus-visible ring: `outline-2 outline-ring outline-offset-2`, the same as
  outline rows.
- Contrast: labels `text-muted-foreground` (6.1:1 on `--background`), field
  text `text-foreground`; the coral accent only for the selected-tab underline
  and focus rings.
- Reduced motion honoured (above). No hover-only affordances: the close button
  is always visible.

## States

| State                | Trigger                                         | UI                                                                                                             |
| -------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Closed               | default                                         | Nothing rendered; no persistent button anywhere                                                                |
| Ready / empty fields | document loaded, `summary`/`pov` are `''`       | Placeholders "What's this about?" / "Whose eyes?"; nothing else differs                               |
| Saving               | a write in flight                               | Status line `Saving…`; fields stay editable                                                                    |
| Saved                | last write succeeded                            | `Saved`, auto-hides after 4s (SaveBar's timing); Updated timestamp refreshes                                   |
| Error                | write failed                                    | `Couldn't save` + **Retry**; field keeps the dirty value; toast                                                |
| Deleted document     | route's doc no longer exists                    | `DocumentPage` already renders "Document not found" without `DocumentLayout`, so the inspector unmounts; `isOpen` stays true for the next document |
| Unsupported item     | route points at a `separator`                   | Panel shows "Separators don't have details." and the close button; no form                                     |
| No POV suggestions   | no other document has a `pov` yet               | POV is a plain input with its placeholder; the `<datalist>` is empty and the browser shows no popup                             |
| Notes tab            | always (MVP)                                    | Disabled tab; never selectable; no panel                                                                       |
| Focus mode           | `isFocusModeAtom`                               | Inspector hidden, strip visible                                                                                |

**No loading or load-error state.** `DocumentPage` renders its own loading,
error and not-found states *instead of* `DocumentLayout`, so the inspector is
only ever mounted with a loaded document. It takes that document as a prop and
runs no query of its own; a switch shows the page's loading state, then the
panel remounts already populated.

<a id="notes-tab"></a>**Notes tab.** No notes entity exists in the schema.
The tab ships disabled so the information architecture is visible and the
later feature slots in without moving anything. It is not hidden, because a
one-tab tab strip reads as a heading and would need re-styling later.

## Acceptance criteria (Given / When / Then)

**Word counts**

1. Given a document is open, when the page renders, then the sidebar footer
   contains no word counts and the editor column's bottom-right shows three
   labelled numbers: `<n> document`, `<n> today`, `<n> total`.
2. Given the strip is visible, when the writer types, then `document` and
   `total` update within the existing 500ms live-count debounce and `today`
   reflects the existing per-document daily delta.
3. Given focus mode is on, when the page renders, then the strip is still
   visible and the inspector is not.

**Opening**

4. Given a document row's `⋯` menu is open, when the writer looks at it, then
   **Details** is the second item, directly after **Rename**.
5. Given the row is the active document, when **Details** is selected, then the
   inspector opens on the Details tab and focus is on the Title input.
6. Given the row is a different document, when **Details** is selected, then
   the URL becomes `/document/<thatId>` and the inspector shows that document.
7. Given the inspector is already open for the active document, when
   **Details** is selected again, then it stays open and focus moves to Title.

**Fields**

8. Given the inspector is open on a document, then it shows Title, Status,
   Summary, POV, Created and Updated — and no Labels field and no word count;
   given it is open on a **folder**, then the POV field is absent and the rest
   are unchanged.
9. Given Title is edited to `"Dinner "`, when the field blurs, then
   `updateDocumentById` is called with `{ title: "Dinner" }` and the outline row
   reads "Dinner".
10. Given Title is cleared, when the field blurs, then no mutation is sent and
    the field restores the previous title.
11. Given Status is `null`, when "Drafting" is chosen, then the mutation is sent
    immediately and the row's status dot updates.
12. Given Summary is typed into, when 1000ms pass with no keystroke, then one
    mutation is sent with the final text.
13. Given another document already has POV "Mara", when the POV field is
    focused on this document, then "Mara" is offered as a suggestion; when it
    is chosen, the same debounced save runs as for typed text.
14. Given no document has a POV yet, when the POV field is focused, then the
    field still accepts free text and no suggestion list is shown; after that
    value saves, it is offered on the next document.
15. Given a save succeeds, then the status line reads "Saved" and Updated shows
    the server's new `updatedAt`.
16. Given a save fails, then the status line reads "Couldn't save" with a Retry
    button, the field keeps the typed text, and a toast appears; when Retry is
    pressed, the same patch is resent.

**Closing / switching**

17. Given the inspector is open with an unsaved Summary, when the close button
    is pressed, then the save is sent first and the panel closes.
18. Given focus is inside the panel, when Escape is pressed, then the panel
    closes, focus-mode is **not** exited, and focus returns to the row's `⋯`
    button (or the editor if that button is gone).
19. Given the inspector is open, when another document row is clicked, then
    the panel remains open and shows the new document's fields.
20. Given the active document is deleted, when the app navigates to the
    adjacent document, then the inspector shows that document.

**Layout / motion**

21. Given a 1440px viewport, when the panel opens, then the text column is
    still 692px wide and no manuscript text is covered.
22. Given a 1280px viewport, when the panel opens, then the text column
    narrows to ≥585px and stays centred within the remaining space.
23. Given a 1024px viewport, when the inspector opens, then it slides over the
    page with a scrim, the left sidebar collapses, and a toggle for each appears
    in the top bar; at ≥1280px neither toggle is rendered.
24. Given `prefers-reduced-motion: reduce`, when the panel opens, then no
    width or slide transition runs.

**Data / API**

25. Given user A's document, when user B patches its `summary`, then the
    response is `null`/error and the row is unchanged (`getTestPool()`).
26. Given a `summary` of 50,000 characters, when patched, then it saves and
    reads back intact; given a `pov` of 121 characters, then the DB rejects it.
27. Given `title`, `status`, `summary` or `pov` is patched, then `updated_at`
    advances; given only `position` is patched, then it does not.
28. Given `createNode` is called without summary/pov, then the row is created
    with `''` for both.

## Testing Strategy

Per `.claude/rules/testing.md` this change is: new/changed migration (API
integration + RLS), new web feature (web integration + unit), new UI
components (stories), and one cross-cutting journey (e2e).

**Unit (Vitest, DB-free)**

- `inspector.atom.test.ts` — open/close/tab transitions.
- `use-document-details-save.test.ts` — debounce, flush-on-unmount, title
  trim/empty rule, error keeps dirty value, retry resends the same patch
  (fake timers, mocked `graphqlClient` is **not** used — MSW handlers are).
- `use-pov-suggestions.test.ts` — case-insensitive dedupe keeps the most-used
  spelling, empty/whitespace values dropped, frequency-then-alpha order, cap at
  `POV_SUGGESTION_LIMIT`, empty list when the outline cache is cold.

**Web integration (`renderWithProviders` + MSW)**

- `word-count-strip.test.tsx` — labels and numbers; not rendered in sidebar
  (assert `SidebarFooterActions` has no "Total words").
- `row-menu.test.tsx` (extend `outline-row.test.tsx`) — Details is directly
  after Rename; selecting it calls `onOpenDetails(id)`.
- `document-inspector.test.tsx` — AC 5, 8–17: loading skeleton, fields
  populated from `GetDocument`, blur/select/debounce mutations captured via
  `server.use(graphql.mutation('UpdateDocumentDetails', …))`, error + Retry,
  Escape closes and restores focus, remount on id change, separator state.
- `document-inspector.test.tsx` (POV) — AC 13–14: the `<datalist>` holds the
  labels from the mocked outline and not the empty ones; choosing one fires the
  same patch as typing.
- `document-layout.test.tsx` (extend) — push vs collapsed mode by mocking
  `matchMedia`: toggles absent at ≥1280px, present below; opening one panel
  collapses the other; strip present in focus mode, inspector absent.

**API integration (`document-details.integration.test.ts`)**

- Patch summary/pov via GraphQL and read back; defaults on `createNode`;
  a 50k-character summary round-trips; the `pov` CHECK (121 chars) is rejected;
  `updated_at` trigger
  fires for the four columns and not for `position`; RLS: user B cannot read
  or patch A's summary (negative control per the rule).

**Storybook (`packages/ui/stories/`)**

- `word-count-strip.stories.tsx` — zero, typical, large numbers.
- `document-inspector.stories.tsx` — loading, ready, empty fields, saving,
  saved, error, unsupported (separator), folder (no POV field), POV with
  suggestions and POV with none, collapsed-with-toggle (below 1280px).
- `row-menu.stories.tsx` — add the Details item.

**E2E (Playwright, one flow)**

- `e2e/tests/document-details.spec.ts`: log in → `⋯` → Details → type a
  Summary → wait for the `updateDocumentById` response → reload → reopen
  Details → Summary persists. Mirrors `edit-persist.spec.ts`.

Not tested: hover/visual styling (jsdom asserts class names, not behaviour);
the reduced-motion media query beyond the class being present.

## Code Style

Follow `row-menu.tsx`, `save-bar.tsx` and `document-page.hooks.ts`:

```tsx
// document-inspector-details.tsx (shape, not final code)
const FIELD = 'flex flex-col gap-1.5';
const LABEL = 'text-[11.5px] font-semibold text-muted-foreground';

export const DocumentInspectorDetails = memo(function DocumentInspectorDetails({
  details,
  onOpenFocus,
}: DocumentInspectorDetailsProps) {
  const { title, status, summary, pov, saveState, commitTitle, setStatus,
    setSummary, setPov, retry } = useDocumentDetailsSave(details);

  return (
    <form className="flex flex-col gap-5 px-5 pt-4" onSubmit={(e) => e.preventDefault()}>
      <div className={FIELD}>
        <Label htmlFor="inspector-title" className={LABEL}>Title</Label>
        <Input id="inspector-title" ref={onOpenFocus} value={title.value}
          onChange={(e) => title.set(e.target.value)} onBlur={commitTitle}
          onKeyDown={(e) => e.key === 'Enter' && commitTitle()} />
      </div>
      {/* Status: DropdownMenu trigger styled as a field + <StatusMenuItems /> */}
      {/* Summary: Textarea, auto-growing, no maxLength */}
      {/* POV: Input maxLength={POV_MAX} list="inspector-pov-options" + <datalist> */}
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[11.5px] text-muted-foreground">
        <dt>Created</dt><dd className="text-right tabular-nums"><time dateTime={details.createdAt}>…</time></dd>
        <dt>Updated</dt><dd className="text-right tabular-nums"><time dateTime={details.updatedAt}>…</time></dd>
      </dl>
      <p role="status" className="text-[11.5px]">{/* Saving… / Saved / Couldn't save + Retry */}</p>
    </form>
  );
});
```

- Components `memo`-wrapped like the outline components; callbacks stable via
  `useCallback`.
- Class strings hoisted to `const`s; sizes as arbitrary values where the
  neighbours do (`text-[11.5px]`, `h-8.5`).
- Constants in `features/document/constants/inspector.constants.ts`
  (`INSPECTOR_WIDTH = '336px'`, `INSPECTOR_PUSH_MIN_WIDTH = 1280`,
  `DETAILS_DEBOUNCE_MS = 1000`, `POV_MAX = 120`,
  `POV_SUGGESTION_LIMIT = 50`). The 180ms motion lives in
  `shared/components/side-panel.tsx` as `PANEL_MOTION_MS`, because both panels
  use it and shared code can't import from a feature.
- No cross-feature imports: `sidebar` → `shared/state/inspector.atom`;
  `document` renders the panel. `WordCountStrip` moves into `document`.
- Comments only for the non-obvious (why the trigger is column-scoped, why
  Details isn't a toggle, why the strip is `aria-live="off"`).
- Conventional Commits; no `Co-Authored-By`.

## Boundaries

- **Always**: TDD for the save hook and the migration; stories for every new
  component; surface every failure (status line + toast); keep `pnpm test:api`
  DB-free; use context7 before touching Radix Tabs / the shadcn Sidebar API.
- **Ask first**: any column beyond `summary`/`pov`; a `characters` table;
  persisting inspector state; changing the 2500ms editor autosave; adding a
  test dependency; changing `SIDEBAR_WIDTH`.
- **Never**: edit `packages/ui/src/components/ui/*`; add labels/tags, beat
  sheets, character databases, AI or analytics; build a POV management UI
  (renaming, merging or deleting labels); put word counts back in the
  sidebar or into the inspector; add a persistent Details button; write
  `down()` migrations; touch `plate-editor.tsx`.

## Staged implementation plan

Smallest useful slice first; each stage is shippable on its own.

1. **Word-count strip** (web only, no API). Move `WordCounts` →
   `WordCountStrip` in `features/document`, render it in `DocumentLayout`,
   remove it from the sidebar footer, update tests + story. Visible value on
   day one and it removes the cross-feature import.
2. **Schema + API**. Migration 023 (columns, CHECKs, trigger) with the
   integration test file (RLS, trigger, constraints, defaults). Extend
   `GET_DOCUMENT` and `GET_OUTLINE` (which gains `pov`), add
   `UPDATE_DOCUMENT_DETAILS` + MSW handler/fixtures.
3. **Inspector shell, inline mode**. `inspector.atom`, `InspectorHost` (push
   mode only), `DocumentInspector` with tabs (Notes disabled), close button,
   Escape, focus move/restore, loading/error/unsupported states. Wire
   **Details** through `RowMenu → OutlineRow → OutlineTree → DraftSection`.
   Stories + integration tests for open/close/switch.
4. **Details form + saves**. `useDocumentDetailsSave`, the four fields,
   timestamps, status line, retry, flush on close/switch/`pagehide`, and
   `usePovSuggestions` + the POV `<datalist>`. Unit + integration tests;
   stories for saving/saved/error and for POV with/without suggestions.
5. **Responsive collapse + motion**. `useMediaQuery` and the shared `SidePanel`
   wrapper; below 1280px both panels collapse off-canvas with a toggle each,
   mutually exclusive, with a scrim; 180ms `motion-safe` transition and the
   reduced-motion check; layout tests for both modes.
6. **E2E** — the single persist-across-reload journey.
7. **Docs** — `CLAUDE.md` only if a command changes (none expected); this spec
   gets the PR link.

## Decisions (resolved 2026-09-24)

1. **POV is hidden on folders.** It renders only for `kind === 'document'`.
2. **Word counts move as-is.** `today` stays per-document for now; the whole
   strip is up for redesign in a later pass ([why](#word-count-deferral)).
3. **Both panels collapse below 1280px**, each with its own toggle, mutually
   exclusive, and no toggles at all above 1280px ([Layout](#layout)). The
   `Sheet` overlay is dropped.
4. **No summary length limit.** The CHECK constraint and `maxLength` are gone;
   the `Textarea` grows with its content.

## Open questions

None blocking. Two things to settle when their turn comes, neither of which
changes what gets built here:

1. What the word-count strip should actually show, once `today` and `document`
   are reconsidered together.
2. Whether the Notes tab becomes a real feature or is dropped, which decides
   if the tab strip stays.

## Assumptions

- Status values, colours and menu items are reused verbatim from
  `status-control.tsx`; no new status is introduced.
- The inspector is not persisted across reloads.
- "Currently selected item" means the document at `/document/:id`; the panel
  never shows a node other than the route's.
- Existing timestamps are shown in the browser locale via
  `toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })`,
  matching the mockup's `12 Sep 2025, 10:24`.
- Folder rows keep navigating to `/document/:id` as they do today, so the
  inspector works for them without new routing.
