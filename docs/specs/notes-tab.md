# Spec: Notes tab

> Status: Draft
> Branch: `feat/notes-tab`
> Card: https://cloud.rgalan.es/index.php/apps/deck/board/6/card/171
> Depends on: `docs/specs/document-details.md` ("Notes tab" section). This spec settles its open question #2: Notes stays, and so does the tab strip.

## Objective

The document inspector has a **Details | Notes** tab strip, but Notes ships
disabled. Writers need somewhere to keep research, reminders and loose ends
about a scene or chapter without putting them in the manuscript, where they
would count towards the word count.

This turns the tab into one plain-text scratchpad per document or folder. It
autosaves like the Summary field.

### Success criteria

- [ ] The Notes tab is enabled for documents and folders. Separators still show
      no tabs.
- [ ] A note saves without an explicit action and survives a reload.
- [ ] Moving between tabs loses nothing, including text typed less than a second
      ago and text in Summary or POV.
- [ ] Editing a note moves the **Updated** timestamp, and nothing else about the
      document changes: not content, word counts or versions.
- [ ] Save failures are shown in the panel and via toast, with a working Retry.

### Decisions (resolved 2026-11-04)

1. **One note per document.** A column on `documents`, not a table. No list, no
   titles, no ordering.
2. **Plain text.** The existing `Textarea`, with no formatting.
3. **Documents and folders.** The same reach as Summary.
4. **A note edit moves Updated.** The same as Summary and POV.

### Out of scope

- Multiple notes, rich text or Markdown rendering.
- Notes in version history, export, search or word counts.
- Showing that a document has notes in the outline.
- Opening the inspector straight on Notes from the row menu. **Details** keeps
  opening the Details tab.

## Data model

Migration `028_document-notes.ts`, forward-only. Use the next free number at
merge time, because other branches also add migrations.

| Column  | Type   | Default | Constraint | Notes                                                                                                                   |
| ------- | ------ | ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `notes` | `text` | `''`    | `NOT NULL` | No length limit, the same as `summary`. `''` rather than NULL gives controlled inputs a string and leaves `create_node` unchanged. |

The migration also replaces the `updated_at` trigger so that it covers the new
column. A trigger's column list can't be altered in place, so it is dropped and
recreated. The function stays the same.

```sql
DROP TRIGGER documents_touch_updated_at_trg ON documents;
CREATE TRIGGER documents_touch_updated_at_trg
  BEFORE UPDATE OF title, status, summary, pov, notes ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_touch_updated_at();
```

Existing rows get `''` from the default. The RLS policies on `documents` already
cover the new column, and PostGraphile exposes it on `Document` and
`DocumentPatch`, so there is no API code to write.

`restore_document_version` and the version tables don't touch the column, so
restoring a version leaves the note as it is.

## Web

### Persistence

`useDocumentDetailsSave` gains `notes` and `setNotes`, using its existing
debounced path (`DETAILS_DEBOUNCE_MS`, 1000ms). It needs no separate hook or
mutation:

- Pending note and metadata edits go out as one patch, in order.
- Unmount, `pagehide` and collapse flushes, retry, and the error toast already
  work.
- Notes are stored exactly as typed. Whitespace isn't trimmed.

`GET_DOCUMENT`, `UPDATE_DOCUMENT_DETAILS`, the `DocumentDetails` type, the type
in `document-page.tsx`, the cache merge in `saveDetails` and the test fixtures
and handlers all gain `notes`. `GET_OUTLINE` does not, so note text isn't loaded
for the whole tree.

### The save hook moves above the tabs

This is the one structural change, and enabling the tab depends on it.

Radix unmounts inactive `TabsContent`, and the hook currently lives inside
`DocumentInspectorDetails`. That didn't matter while there was only one usable
tab. With two, each tab switch would unmount the hook, and returning to Details
would re-read `summary` and `pov` from the query cache, which may not yet hold
the edit still in flight.

- A new internal `InspectorTabs` component in `document-inspector.tsx` owns the
  hook and the collapse flush, and renders the `Tabs`. It is only rendered for
  non-separators, so separators don't run the save hook.
- `DocumentInspectorDetails` takes `save` as a prop. Its `memo` is removed,
  because the hook returns a new object on every render and the memo could no
  longer skip anything.
- `DetailsSaveStatus` renders once, in the header row, right-aligned before the
  close button. It covers both tabs, so its live region and fade timer survive a
  tab switch, and it stays visible however far a long note or the Details tab is
  scrolled. This replaces the "panel footer" described in `document-details.md`
  and moves the status line in the Details tab from above the timestamps to the
  top right of the panel.
- The Details `TabsContent` uses `forceMount` and is hidden with
  `data-[state=inactive]:hidden`. The row menu's **Details** switches the tab
  and requests focus on Title in the same update, and Radix only mounts an
  inactive panel's children one commit later, so the focus effect would miss
  Title. Notes still unmounts when inactive.

### Tab state

`Tabs` becomes controlled by `inspectorAtom.tab`, which exists but is unused, via
a new `setInspectorTabAtom`.

| Event                                   | Active tab afterwards                     |
| --------------------------------------- | ----------------------------------------- |
| Row menu **Details**, open or closed    | Details, with focus on Title (as today)   |
| Switching document while Notes is open  | Notes, so a writer can read across scenes |
| Passing through a separator             | Notes again on the next document          |
| Collapsing below 1280px and re-expanding | Unchanged                                 |
| Closing the panel, then reopening       | Details                                   |

A document switch doesn't move focus, the same as today.

### Notes panel

New `document-inspector-notes.tsx`, rendering a shadcn `Textarea` that fills the
height of the panel and scrolls internally.

- **Tab content:** `flex min-h-0 flex-1 flex-col`. The textarea takes
  `min-h-0 flex-1 resize-none field-sizing-fixed`, overriding the primitive's
  grow-with-content sizing from the outside. `packages/ui/src/components/ui/` is
  not edited.
- **Text style:** the same size and colour as the other inspector controls.
- **Label:** a `Label` with `sr-only`, reading "Notes". The tab already names the
  panel visually.
- **Empty state:** only the placeholder, `Research, reminders, loose ends…`.
- **Keyboard:** Tab leaves the field as usual, and Escape closes the panel, with
  the pending save flushed on unmount.

The tab trigger loses `disabled` and its `title`, and `TAB` loses
`disabled:opacity-100`, which nothing else needs.

## States

| State               | Behaviour                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Empty               | Placeholder only                                                                            |
| Long note           | The textarea scrolls; the tab strip and save status stay in place                           |
| Saving / saved      | Shared status line: `Saving…`, then `Saved`, fading after 4s                                |
| Save failed         | Text is kept, status shows `Couldn't save` with Retry, and the existing toast fires         |
| Separator           | No tabs, as today                                                                           |
| Focus mode          | Inspector hidden, pending save flushed on unmount, as today                                 |
| Deleted document    | The patch returns `null`, which is treated as a failed save, as with Summary                |

The toast keeps its current wording, "Could not save details — try again.", which
is still accurate for a note.

## Acceptance criteria

1. Given a document or folder is open in the inspector, when the writer looks at
   the tab strip, then Notes is enabled and reachable with the arrow keys.
2. Given the Notes tab is open and the note is empty, then the placeholder is
   shown and the field is empty.
3. Given the writer types a note, when 1000ms pass without typing, then a patch
   containing `notes` is sent and the status shows `Saving…`, then `Saved`.
4. Given a note was saved, when the page reloads and Notes is opened, then the
   note is unchanged.
5. Given an unsaved edit in Notes, when the writer switches to Details within the
   debounce and back, then the text is intact and is saved once the debounce
   ends. The same holds for Summary and POV in the other direction.
6. Given an unsaved edit in Notes, when the panel closes, the document changes or
   the page is hidden, then the edit is sent immediately.
7. Given a save fails, then the text stays, `Couldn't save` and Retry appear, a
   toast fires, and Retry sends the latest text.
8. Given a note edit saves, then **Updated** moves, and `content`, `word_count`
   and the document's versions are unchanged.
9. Given Notes is active, when the writer selects another document, then Notes is
   still active and shows that document's note, with focus unmoved.
10. Given Notes is active, when the row menu's **Details** is selected, then the
    Details tab opens with focus on Title.
11. Given a separator is selected, then no tabs are shown.
12. Given user B, when they read or patch user A's document, then A's note is
    neither returned nor changed.

## Project structure

```text
apps/api/src/db/migrations/028_document-notes.ts            new
apps/api/src/test/document-details.integration.test.ts      extended
apps/web/src/features/document/
  api/document.api.ts                                       notes in two operations
  document.types.ts                                         notes on DocumentDetails
  hooks/use-document-details-save.ts                        notes, setNotes
  components/document-page.tsx                              notes in the query type
  components/document-inspector.tsx                         InspectorTabs, header status
  components/document-inspector-details.tsx                 takes save as a prop
  components/document-inspector-notes.tsx                   new
  components/document-inspector-notes.test.tsx              new
apps/web/src/shared/state/panels.atom.ts                    setInspectorTabAtom
apps/web/src/test/mocks/{fixtures,handlers}.ts              notes
packages/ui/stories/document-inspector.stories.tsx          extended
```

## Commands

```bash
pnpm docker:up && pnpm db:migrate && pnpm test:db:setup
pnpm test:api:int document-details
pnpm test:web document-inspector use-document-details-save panels
pnpm storybook
```

## Testing strategy

| Layer                       | Covers                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| API integration (GraphQL)   | Default `''` on existing and new rows, a patch persists, Updated moves, content columns untouched, a version restore keeps the note, **RLS isolation for read and update** |
| Web hook test               | `notes` debounce, flush, retry, and merging into one patch with `summary`; the cache merge includes `notes`                 |
| Web integration (MSW)       | Criteria 1–3, 5–7 and 9–11, written first (TDD)                                                                              |
| Storybook                   | `packages/ui/stories/document-inspector.stories.tsx` (Storybook only loads that folder): Notes empty, Notes with long text, Notes save failed, alongside the existing Details and separator stories |

The test `opens on Details with Notes visible but disabled` changes to expect an
enabled tab. No test is skipped or deleted to get to green.

**E2E:** none added. Notes isn't a new cross-cutting journey, and the existing
`document-details.spec.ts` reload test already covers this write path through
Summary.

## Code style

Follows the existing inspector: constant class strings, no comments that restate
the code, UI primitives from `@ui/components/ui/*`.

```tsx
<TabsContent value="notes" className="flex min-h-0 flex-1 flex-col px-6 pt-5">
  <DocumentInspectorNotes value={save.notes} onChange={save.setNotes} />
</TabsContent>
```

## Boundaries

- **Always:** route writes through `useDocumentDetailsSave`, and surface every
  failure.
- **Ask first:** new dependencies, any change to the note's stored format, or any
  scope in "Out of scope" above.
- **Never:** edit `packages/ui/src/components/ui/`, write `saveStatusAtom` (it
  belongs to the editor), or add notes to `plain_text` or `word_count`.

## Implementation stages

1. Migration and API integration tests, including RLS.
2. `notes` in the queries, types, fixtures and save hook, with hook tests.
3. Move the hook above the tabs and the status to the header, with no behaviour
   change other than the status position. Existing tests stay green.
4. Controlled tabs, the Notes panel, enabling the tab, integration tests and
   stories.

## Open questions

None blocking.

**Inherited behaviour, not changed here:** field values are seeded from the query
cache on mount, and the cache is only updated when a save succeeds. If the writer
closes and reopens the panel, or leaves and returns to a document, while a flushed
save is still in flight, the field can show the previous text, and typing would
then overwrite the flushed edit. Summary and POV already have this window, which
lasts about one request. Notes are more likely to hold text worth keeping, so
writing pending values into the cache at flush time could be a follow-up.

## Assumptions

- A single-user, last-write-wins model, as in `document-details.md`. Two tabs
  editing the same note overwrite each other.
- Notes are prose of a size the existing request limit handles. There is no
  client or database limit, and a note larger than the limit surfaces as a normal
  failed save.
