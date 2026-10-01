# Plan: Document Details Inspector

> Status: Draft — awaiting review
> Spec: [`document-details.md`](./document-details.md)
> Branch: `feat/document-details`

## Approach summary

| #   | Piece                    | File(s)                                                       | Mechanism                                                                                                                            |
| --- | ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| A   | Word-count strip         | `features/document/components/word-count-strip.tsx`           | Move `WordCounts` out of `sidebar`, add the `document` number, render `sticky bottom-0` at the window's right edge                     |
| B   | Off-canvas panels        | `shared/components/side-panel.tsx`                            | One wrapper: `fixed inset-y-0` + `translate-x` + `inert` when collapsed. Wraps `AppSidebar` on the left, `DocumentInspector` on the right |
| C   | Breakpoint               | `apps/web/src/shared/hooks/use-media-query.ts`                     | `matchMedia` hook with **synchronous** initial value (no first-paint flash)                                                          |
| D   | Panel coordination       | `shared/state/panels.atom.ts`, `shared/hooks/use-panels.ts`    | Write atoms enforce mutual exclusion; the hook derives visibility from the breakpoint                                                |
| E   | Details menu item        | `features/outline/components/row-menu.tsx`                     | Reuse the existing `pendingRenameRef` + `onCloseAutoFocus` deferral so focus lands in the panel, not back on the trigger              |
| F   | Metadata save            | `features/document/hooks/use-document-details-save.ts`         | `useAutoSave`'s refs+timer shape, per field, with its own local status (never `saveStatusAtom`)                                       |
| G   | Schema                   | `apps/api/src/db/migrations/023_document-details.ts`           | `summary` + `pov` columns; `BEFORE UPDATE OF title, status, summary, pov` trigger for `updated_at`                                    |
| H   | POV suggestions          | `features/document/hooks/use-pov-suggestions.ts`               | Derive distinct labels from the `['outline']` query cache — no new request, no new entity                                            |

## Why these mechanisms

### B — off-canvas: one wrapper, not the shadcn sidebar

**Chosen**: a ~30-line `SidePanel` that both sides share.

```tsx
<aside
  aria-label={label}
  inert={collapsed}
  className={cn(
    'fixed inset-y-0 z-20 flex w-(--panel-width) flex-col bg-background',
    side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
    'motion-safe:transition-transform motion-safe:duration-180 motion-safe:ease-out',
    collapsed && (side === 'left' ? '-translate-x-full' : 'translate-x-full')
  )}
/>
```

**Rejected — shadcn `Sidebar collapsible="offcanvas"`** for one or both panels:

- `SidebarProvider` holds a **single** `open` state for every `Sidebar` beneath
  it (`sidebar.tsx:74`), so a left and a right sidebar cannot be toggled
  independently without nesting a second provider.
- Below 768px `Sidebar` replaces itself with a `Sheet` (`sidebar.tsx:183`). The
  spec dropped the Sheet; we would be reintroducing it on one side only.
- It renders a `peer` + gap-div pair that assumes it is a direct child of the
  provider's flex row. `WorkspaceLayout` wraps the sidebar in
  `<div className="sticky top-0 self-start h-svh">`, so those assumptions do not
  hold here.
- Fixing any of that means editing `packages/ui/src/components/ui/sidebar.tsx`,
  which is shadcn-managed and off limits.

`AppSidebar` therefore keeps `collapsible="none"` and is simply wrapped;
`WorkspaceLayout` already owns the decision of whether it renders at all (focus
mode), so the responsive branch belongs there.

**Rejected — a second `SidebarProvider`** around the inspector: it writes the
sidebar cookie on every toggle and binds ⌘B, both of which would fight the real
sidebar.

`inert` is a real HTML attribute and a first-class boolean prop in React 19, so
a collapsed panel drops out of the tab order without a `tabindex` sweep.

### C — a new media-query hook instead of reusing `use-mobile.ts`

`useIsMobile` seeds state as `undefined` and corrects it in an effect, so the
first paint always reports "not mobile". For a 1280px layout switch that is a
visible flash of the pushed layout before it collapses. `useMediaQuery`
initialises from `window.matchMedia(query).matches` inside `useState`'s lazy
initialiser — correct on first paint, and safe because this app has no SSR.

`use-mobile.ts` itself is left alone: `sidebar.tsx` depends on it and we are not
changing shadcn behaviour as a side effect. The new hook lives in
`apps/web/src/shared/hooks/`, not beside `use-mobile.ts` in `packages/ui`:
`packages/ui` has no test runner, and every consumer is in `apps/web`. It is
built on `useSyncExternalStore`, which reads the snapshot during render.

### D — mutual exclusion in the atoms, visibility in the hook

The original plan put the mutual-exclusion rule ("below 1280px, opening one
panel collapses the other") in `usePanels`, because it seemed to depend on the
viewport. It doesn't. Above 1280px both `collapsed` and `outlineOpen` are
ignored, so enforcing the rule at every width is harmless. That lets it live in
the write atoms (`openInspectorAtom`, `setInspectorCollapsedAtom`,
`setOutlineOpenAtom`). This matters: `DraftSection` opens the inspector by
writing `openInspectorAtom` directly, and a hook-only rule would miss that path.

`usePanels` only derives visibility (`isDesktop || outlineOpen`, and so on). It
never writes state back on a breakpoint change, so no effect is involved
(`.claude/rules/state.md`: never sync atoms with an effect chain), and the
narrow layout comes back as the writer left it.

### E — deferred focus from the row menu

`RowMenu` already solves this for Rename: acting inside `onSelect` runs while
the menu is still closing, and Radix's focus trap pulls focus back to the
trigger. Details has the same shape (open panel → focus Title), so it shares
the same deferral: one ref records the pending action and `onCloseAutoFocus`
runs it. The one difference is deliberate — Rename calls `preventDefault()` so
focus isn't restored onto the trigger (that would blur the new input), while
Details **lets** Radix restore focus to the trigger, so the panel can record it
as the return target before moving focus into Title. A test locks this in and
fails if Details ever suppresses the restore.

### F — saves separate from the editor's

`useAutoSave` owns `saveStatusAtom`, `lastSavedAtom` and the `SaveBar`. Two
writers on one status atom would flicker against each other, so the inspector
keeps a local `saveState` and renders its own `role="status"` line using the
SaveBar's vocabulary and colours.

The two writers never collide on data either: `update_document_content` touches
`content/plain_text/word_count`, the inspector patches
`title/status/summary/pov`, and each `onSuccess` merges **only its own fields**
into `['document', id]` — the same narrow-merge pattern as
`document-page.hooks.ts:51`.

### G — column-scoped `updated_at` trigger

Today nothing stamps `updated_at` on a rename or a status change:
`updateDocumentById` is PostGraphile's generic patch, and only the SQL functions
(`update_document_content`, `move_and_reorder_node`) set it. The inspector shows
"Updated", so it would display a stale date.

- **Rejected — a plain `BEFORE UPDATE` trigger**: `move_and_reorder_node`
  rewrites `position` on every sibling, so a drag would restamp a whole chapter.
- **Rejected — stamping inside a new SQL function**: `updateDocumentById` is
  still exposed and would bypass it.
- **Chosen**: `BEFORE UPDATE OF title, status, summary, pov`, following the
  `documents_check_parent_trg` precedent in `022` (same `LANGUAGE plpgsql`,
  same `SET search_path = pg_catalog, public`).

`summary` and `pov` are `text NOT NULL DEFAULT ''` so `create_node` needs no
change and every controlled input has a string. `pov` keeps a 120-char CHECK;
`summary` has no limit.

### H — POV suggestions from the cache

`GET_OUTLINE` already fetches every row for the tree and is already invalidated
by an inspector save, so adding `pov` to it makes the `<datalist>` free — no
request, no table, nothing to administer. Rejected alternatives and the
consequences of deriving rather than storing are in the spec's
[POV suggestions](./document-details.md#pov-suggestions).

## Phases

Each phase is shippable on its own and ends green. Tests come first for logic
(the save hook, the suggestions hook, the migration); component tests are
written alongside.

### Phase 1 — Word-count strip (web only)

1. Move `features/sidebar/components/word-counts.tsx` →
   `features/document/components/word-count-strip.tsx`; move its test; rename
   the story. The move is what fixes the existing cross-feature import
   (`sidebar` reaching into `document` internals).
2. Add the `document` number (the sidebar block only showed today + total) and
   relabel to `<n> document`, `<n> today`, `<n> total`.
3. Render it in `DocumentLayout` as a sibling of `<main>`: `sticky bottom-0`,
   right-aligned, `pr-[26px]` (the mockup lines it up with the top bar's button,
   not with the text column), `aria-live="off"`.
4. Drop `<WordCounts />` from `SidebarFooterActions`; assert in its test that no
   count remains.

Ships without any API work. ~1–2 hours.

### Phase 2 — Schema + API

1. Write `apps/api/src/test/document-details.integration.test.ts` first:
   defaults on `create_node`, a 50k-char summary round-trip, the `pov` CHECK
   rejecting 121 chars, the trigger firing for the four columns and **not** for
   `position`, and the RLS negative control (user B cannot read or patch A's
   summary).
2. Write `023_document-details.ts` (forward-only, no `down()`), then
   `pnpm db:migrate` + `pnpm test:api:int`.
3. Extend `GET_DOCUMENT` with `kind status summary pov`, add `pov` to
   `GET_OUTLINE`, add `UPDATE_DOCUMENT_DETAILS`.
4. Update `test/mocks/{fixtures,handlers}.ts` with the new fields and an
   `UpdateDocumentDetails` handler.

~2–3 hours, most of it the integration test.

### Phase 3 — Inspector shell (push mode only)

1. `npx shadcn@latest add tabs textarea` from `packages/ui`; register `info`
   and `x` in the icon registry.
2. `shared/state/panels.atom.ts` + its unit test.
3. `DocumentInspector`: tab strip (Notes disabled), close button, Escape with
   `preventDefault()`, focus move on open and restore on close, the
   timestamps, and the unsupported-separator state. No loading or load-error
   state: `DocumentPage` only renders the layout once the document has loaded.
4. Thread `onOpenDetails` through `RowMenu` → `OutlineRow` → `OutlineTree` →
   `OutlineTreeCallbacks` → `DraftSection` (navigate, then open).
5. Render the panel in `DocumentLayout` beside the editor column, push mode
   only, keyed by `doc.id`.
6. Stories: row menu with Details; inspector document / folder / separator.

~4 hours. After this the feature is usable at desktop widths with empty fields.

### Phase 4 — Details form + saves

1. `use-document-details-save.test.ts` first: debounce, flush on unmount, title
   trim/empty rule, error keeps the dirty value, retry resends the same patch.
2. `use-pov-suggestions.test.ts`: dedupe, ordering, cap, cold cache.
3. Implement both hooks, then `DocumentInspectorDetails`: Title, Status
   (`DropdownMenu` + the existing `StatusMenuItems`), Summary (auto-growing
   `Textarea`, no limit), POV (`Input` + `<datalist>`, documents only), the
   `<dl>` timestamps and the status line with Retry.
4. Flush on close, on document switch and on `pagehide`.
5. Integration tests for AC 8–18; stories for saving / saved / error / folder /
   POV with and without suggestions.

~5 hours.

### Phase 5 — Responsive collapse + motion

1. `apps/web/src/shared/hooks/use-media-query.ts` + test.
2. `shared/components/side-panel.tsx` + `shared/hooks/use-panels.ts`.
3. `WorkspaceLayout` wraps `AppSidebar` in `SidePanel` below 1280px and leaves
   the current sticky flex child above it.
4. Two toggles in `EditorTopBar`, rendered only below 1280px, with
   `aria-expanded` / `aria-controls`; the inspector's appears only while
   `isOpen`.
5. Scrim (collapses, does not close). Mutual exclusion and the breakpoint
   behaviour already live in the atoms and `usePanels` (phase 5.3).
6. `document-layout.test.tsx`: both modes via `matchMedia` mocking.

~3–4 hours; this is the phase most likely to need eyes in the browser.

### Phase 6 — E2E

`e2e/tests/document-details.spec.ts`, mirroring `edit-persist.spec.ts`: log in →
`⋯` → Details → type a Summary → await the mutation response → reload → reopen →
the Summary is there. One flow only.

### Phase 7 — Close-out

Update this plan's and the spec's `> Status:` lines with the PR link, and add a
`CLAUDE.md` note only if a command changed (none expected).

## Verification

```bash
pnpm test:web word-count-strip inspector pov row-menu document-layout
pnpm test:api:int                     # needs docker:up + test:db:setup once
pnpm typecheck                        # what pre-push runs
pnpm storybook                        # visual check of the panel states
pnpm dev                              # 1440 / 1280 / 1024 / 768 by hand
```

Browser checks that no test covers: the 180ms transition and its
`prefers-reduced-motion` variant (jsdom can only assert the class is present),
and the native `<datalist>` popup, which the browser renders outside the DOM we
can query.

## Risks / watch items

1. **Escape inside the POV popup.** Some engines swallow it, others let it reach
   the panel and close the inspector. Accepted in the spec; the debounced save
   flushes on close, so nothing typed is lost.
2. **Focus-mode interaction.** `DocumentLayout`'s Escape listener already skips
   `defaultPrevented` events, so the inspector's handler must call
   `preventDefault()` — otherwise one Escape does both. Covered by AC 16.
3. **The existing `matchMedia` mock always answers `matches: false`**
   (`test/setup.ts:47`) and its listeners are bare `vi.fn()`s. Left as-is, every
   web test would render the *collapsed* layout and the push-mode assertions in
   phases 3–4 would fail for the wrong reason. It needs to become query-aware
   (default: desktop) with working listeners, in phase 3 — not phase 5 — and the
   theme hook that depends on it today must keep resolving to light.
4. **Phase 5 touches the left sidebar**, which the brief did not ask for. If it
   turns out to be fiddlier than estimated, phases 1–4 are already shipped and
   the app is unchanged above 1280px.

## Touchpoints

```
apps/api/src/db/migrations/023_document-details.ts        ← new
apps/api/src/test/document-details.integration.test.ts    ← new

apps/web/src/shared/
├── state/panels.atom.ts                                  ← new
├── hooks/use-panels.ts                                   ← new
├── components/side-panel.tsx                             ← new
└── api/outline.api.ts                                    ← GET_OUTLINE gains pov

apps/web/src/features/document/
├── api/document.api.ts                                   ← fields + UPDATE_DOCUMENT_DETAILS
├── document.types.ts                                     ← DocumentDetails
├── constants/inspector.constants.ts                      ← new
├── components/word-count-strip.tsx                       ← moved from sidebar
├── components/document-inspector.tsx                     ← new
├── components/document-inspector-details.tsx             ← new
├── components/editor-top-bar.tsx                         ← two toggles below 1280px
└── hooks/{use-document-details-save,use-pov-suggestions}.ts

apps/web/src/features/outline/components/
├── row-menu.tsx                                          ← Details after Rename
├── outline-row.tsx, outline-tree.tsx                     ← thread onOpenDetails
└── outline-tree.types.ts                                 ← OutlineTreeCallbacks

apps/web/src/features/sidebar/components/
├── sidebar-footer-actions.tsx                            ← drop <WordCounts />
└── word-counts.tsx                                       ← deleted (moved)

apps/web/src/layouts/{document-layout,workspace-layout}.tsx
apps/web/src/shared/hooks/use-media-query.ts              ← new
packages/ui/src/components/ui/{tabs,textarea}.tsx         ← via shadcn CLI
packages/ui/src/components/icon/icon.tsx                  ← register info, x
packages/ui/stories/{word-count-strip,document-inspector,row-menu}.stories.tsx
e2e/tests/document-details.spec.ts                        ← new
```

Not touched: `plate-editor.tsx` / `MainEditor`, the toolbar dialog, `SaveBar`,
`discussions`, `document_versions`, the outline tree's DnD,
`packages/ui/src/components/ui/sidebar.tsx`, `packages/ui/src/hooks/use-mobile.ts`.

## Out of plan

Per the spec's boundaries: labels/tags, beat sheets, plot structure, a
characters table, AI, analytics, a Notes implementation, a real mobile layout,
a POV management UI, changes to the editor's 2500ms autosave, and any redesign
of what the word-count strip shows.
