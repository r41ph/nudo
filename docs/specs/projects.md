# Spec: Projects

> Status: In review — PR 1 merged (PR #44 — https://github.com/r41ph/nudo/pull/44); PR 2 in review (PR #47 — https://github.com/r41ph/nudo/pull/47)
> Branch: `feat/projects`

## Objective

Let a writer keep more than one book in nudo. Today every document belongs
directly to a user. There is one implicit manuscript per account, and the
sidebar shows the hard-coded placeholder title `"Project Alpha"`. This spec
introduces a **project**, meaning one book or manuscript. A project owns its
outline, and every tool (Story today, and later Plot and Characters) works
inside one project at a time.

This is a prerequisite for Plot (`docs/specs/plot.md`). Plot data belongs to
a project, and a Plot card may only link to documents in its own project.

### User flow

1. A new writer signs up. They get one project, named "Untitled manuscript",
   containing the existing "Chapter One" and welcome document, and they land
   in it.
2. The sidebar header shows the active project's title under a small
   **Manuscript** label, as in the Plot mockups. This replaces
   `"Project Alpha"`.
3. The title is plain text. Projects are managed from the user menu in the
   sidebar footer: **Projects ▸** lists their projects with the active one
   checked, then **New project…**, **Rename "<title>"…** and
   **Delete "<title>"…** for the active project. Switching projects is
   rare, so it stays out of the main area.
4. **New project…** asks for a title, creates the project with a starter
   "Chapter One" folder and an empty "Untitled" document, and opens that
   document.
5. Choosing another project in the menu switches to it: the outline, the
   word counts and the open document all change to that project.
6. Opening nudo at `/` reopens the last project the writer used.

### Success criteria

- [x] Every document belongs to exactly one project. Existing users' documents
      are moved into one project each by the migration, and nothing is lost.
- [x] A user can create, rename, switch between and delete projects.
- [x] The sidebar header shows the active project's real title. The string
      `"Project Alpha"` no longer exists in the code.
- [x] The outline, the word counts (**total** is per project), the POV
      suggestions and document creation are all limited to the active
      project.
- [x] URLs carry the project: `/project/:projectId/document/:documentId`.
- [x] `/` opens the last-used project. If there is none, it opens the most
      recently created project. With no projects at all, it shows an empty
      state with **Create a project**.
- [x] Deleting a project requires typing its title, removes all of its
      documents, versions and discussions, and moves the writer to another
      project or to the empty state.
- [x] The database enforces, on every write path, that a document's project
      belongs to the document's user and that a document's parent is in the
      same project. RLS isolates projects per user.
- [x] Sign-up creates the user, their first project and the starter
      documents in one transaction.

## Repository facts this spec builds on

| Fact | Where |
| --- | --- |
| `documents` is a single tree: `kind` ∈ folder/document/separator, `parent_id`, `position`. There is no folders table any more. | `022_outline-document-tree.ts` |
| Ownership is `documents.user_id`, with four `*_own` RLS policies keyed on `app.current_user_id` | `002_create-documents.ts` |
| `create_node` and `move_and_reorder_node` are `SECURITY DEFINER`, scope by `current_uid` and compute positions per `(user, parent)` | `022` |
| The `documents_check_parent` trigger guards cycles and separator parents on every write path | `022` |
| `document_versions`, `document_settings` and `discussions` hang off `documents ON DELETE CASCADE` | `003`, `004`, `020` |
| Sign-up seeds "Chapter One" and the welcome document in a transaction | `apps/api/src/auth/routes.ts` |
| The outline is one flat query, `allDocuments`, rebuilt into a tree on the client; the **total** word count sums it | `shared/api/outline.api.ts`, `document.hooks.ts` |
| The **today** count is a per-document baseline in `localStorage` | `use-daily-word-delta.ts` |
| Routing is `/document/:id`; links are built in `home-page.tsx`, `draft-section.tsx` and `document-page.tsx` | `router.tsx` |
| The title is hard-coded: `<ProjectHeader name="Project Alpha" />` | `app-sidebar.tsx` |

## Data model

Migration `024_create-projects.ts` (forward-only).

### `projects` (new)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK, `gen_random_uuid()` | |
| `user_id` | `uuid NOT NULL → users ON DELETE CASCADE` | Security ownership. RLS is keyed on this. |
| `title` | `text NOT NULL DEFAULT 'Untitled manuscript'`, CHECK `char_length(trim(title)) BETWEEN 1 AND 200` | |
| `created_at`, `updated_at` | `timestamptz NOT NULL DEFAULT now()` | `updated_at` is touched on a title change, using the same trigger pattern as `023` |

The table has an index on `user_id` and the four `projects_*_own` RLS
policies, copied from `documents`.

### `documents` (changed)

- New column: `project_id uuid NOT NULL → projects ON DELETE CASCADE`, with
  an index on `(project_id, parent_id, position)`.
- **Backfill:** in the same migration, for every user who has documents,
  insert one project titled "Untitled manuscript" and set `project_id` on all
  of that user's documents. The column is then made `NOT NULL`. Users with
  no documents also get a project, so `/` behaves the same for everyone.
- **`documents.user_id` stays.** It remains the RLS key, so the existing
  policies, `SECURITY DEFINER` functions and discussions are unchanged.
  `project_id` is the domain owner. The trigger below keeps the two
  consistent.

### Integrity trigger: `documents_check_project`

A `BEFORE INSERT OR UPDATE OF project_id, parent_id, user_id` trigger rejects
the write when any of the following is true:

- the project's `user_id` differs from the document's `user_id`;
- `parent_id` is set and the parent's `project_id` differs;
- `project_id` changes on an existing row. Moving documents between projects
  is out of scope, and refusing it keeps every subtree whole.

PostGraphile exposes the generic `createDocument` and `updateDocumentById`
mutations, so these rules have to live in the database. This is the same
reasoning as `documents_check_parent`.

### Functions

| Function | Change |
| --- | --- |
| `create_node(...)` | Gains a required `node_project_id uuid` and checks that the project belongs to `current_uid`. `next_pos` is computed per `(project_id, parent_id)`. The old signature is dropped in the same migration so PostGraphile does not expose an overload, as `012` did. |
| `move_and_reorder_node(...)` | No signature change. The trigger rejects a cross-project parent. |
| `create_project(project_title text)` | New, `SECURITY DEFINER`, `search_path` pinned. Inserts the project for `current_uid` plus a "Chapter One" folder containing an empty "Untitled" document, and returns the project. One call means one transaction, so a project never exists without its starter documents. |

Rename uses the generic `updateProjectById` (RLS-scoped). Delete uses the
generic `deleteProjectById`. The cascade takes the documents, and their
versions, settings and discussions follow through their existing cascades.

### Sign-up

`auth/routes.ts` inserts the project inside the existing seed transaction,
and the two seed `INSERT`s gain `project_id`. Nothing else about sign-up
changes.

## Web

### Routing

| Route | Behaviour |
| --- | --- |
| `/` | Resolves a project, then redirects to `/project/:projectId` |
| `/project/:projectId` | Redirects to the project's first document in outline order. With no documents, it shows the existing "no documents yet" empty state, scoped to the project. |
| `/project/:projectId/document/:documentId` | Today's document page |

- **Resolving `/`:** read `nudo:last-project` from `localStorage` (inside
  `try/catch`). If that project is in `allProjects`, use it. Otherwise use
  the most recently created project. With none, show the **Create a
  project** empty state. Opening a project writes the key. Losing the key is
  harmless, which is why it is not stored on the server.
- **Unknown or foreign `projectId`:** RLS returns nothing, so the page shows
  the existing not-found state with a link to `/`. It never shows a
  permission error that would reveal the project exists.
- **`useProjectId()`** (`shared/hooks/`) reads the route param and is the
  only way components learn the active project. No atom stores it, so the
  URL and the app cannot disagree.

### Queries

- New `GET_PROJECTS`, which returns `allProjects(orderBy: CREATED_AT_DESC)
  { id title }`, under the key `['projects']`.
- `GET_OUTLINE` and `GET_DOCUMENTS` take `$projectId` and filter with
  `condition: { projectId }`. Their keys become `['outline', projectId]` and
  `['documents', projectId]`. Every `invalidateQueries(['outline'])` call
  keeps working, because TanStack matches by prefix.
- `CREATE_NODE` passes `projectId`.
- The **total** word count and `usePovSuggestions` read the scoped outline,
  so they become per project with no further change. The **today** baseline
  is per document and needs no change.

### Sidebar header

`ProjectHeader` drops its `name` prop and reads the active project from
`['projects']`. It renders the **Manuscript** label and the title as plain
text, with no menu.

- While `['projects']` loads, the header shows a `Skeleton` for the title.
  On error, it shows "Couldn't load projects" with **Retry**.

### Projects submenu in the user menu

`SidebarFooterActions` (the user menu) gains a **Projects** item, placed
after **Dark mode**, that opens a `DropdownMenuSub`:

```
User menu
├ Dark mode
├ Projects ▸
│   ✓ The Lamp
│     Salt Year
│     ──────────
│     New project…
│     Rename "The Lamp"…
│     Delete "The Lamp"…
├ Settings
└ Sign out
```

- The submenu is one level deep. Rename and delete act on the **active**
  project only; to change another project, switch to it first. A third
  menu level would be hard to use by keyboard, trackpad and in the mobile
  sidebar.
- Project items are `DropdownMenuRadioItem`s; choosing one navigates to
  `/project/:id`.
- **New project…** and **Rename…** open `ProjectTitleDialog`, which has one
  `Input` and Save/Cancel. An empty or whitespace-only title is rejected
  inline. Saving shows a pending state. A failure keeps the dialog open,
  shows the error inline and fires a toast.
- **Delete project…** opens an `AlertDialog`: "Delete 'The Lamp'? This
  removes its 23 documents and can't be undone. Type the title to confirm."
  The destructive button stays disabled until the typed text matches the
  title, ignoring case and surrounding whitespace. On success, go to the
  next project in the list, or to the empty state if there are none.
- While `['projects']` loads, the submenu shows a disabled "Loading
  projects…" item. On error, it shows "Couldn't load projects" and a
  **Retry** item.
- Every control is reachable by keyboard and has an accessible name. The
  submenu opens with →/Enter and closes with ←/Escape (Radix default).

### Errors

Every new mutation follows the existing pattern: `onError` shows a toast
with an `id` and keeps the UI state. Nothing is optimistic except the
rename, which rolls back on error.

## Tech Stack

No new dependencies. React 19, React Router 7, TanStack Query 5, Jotai 2,
shadcn (`DropdownMenu`, `Dialog`, `AlertDialog`, `Input`, `Skeleton` — all
already vendored), PostGraphile, node-pg-migrate, Vitest, MSW, Playwright.

## Commands

```bash
pnpm db:migrate                 # apply 024 (needs pnpm docker:up)
pnpm test:api:int               # projects + scoping + RLS (after pnpm test:db:setup)
pnpm test:web project outline   # filtered web tests
pnpm test:e2e                   # existing journeys + the new project journey
pnpm storybook
```

## Project Structure

```
apps/api/src/db/migrations/024_create-projects.ts
apps/api/src/auth/routes.ts                       ← seed the project
apps/api/src/test/projects.integration.test.ts    ← new
apps/api/src/test/{outline,documents,rls}.integration.test.ts ← pass projectId
apps/web/src/features/project/
├── api/project.api.ts
├── hooks/use-projects.ts, use-project-mutations.ts
└── components/
    ├── projects-submenu.tsx (+ .test.tsx)
    ├── project-title-dialog.tsx
    ├── delete-project-dialog.tsx (+ .test.tsx)
    └── project-redirect.tsx (+ .test.tsx)       ← `/`, `/project/:id`
apps/web/src/shared/hooks/use-project-id.ts
apps/web/src/features/sidebar/components/project-header.tsx
apps/web/src/features/sidebar/components/sidebar-footer-actions.tsx
apps/web/src/app/routes/router.tsx
packages/ui/stories/projects-submenu.stories.tsx, delete-project-dialog.stories.tsx
e2e/tests/projects.spec.ts
```

`SidebarFooterActions` stays in `sidebar` and imports `ProjectsSubmenu`
from `features/project`, which is the direction the frontend boundary rule
allows.

## Testing Strategy

| Layer | What |
| --- | --- |
| API integration | `create_project` seeds the starter tree; rename and delete (the cascade reaches versions and discussions); `create_node` puts new nodes in the right project with positions per project; the trigger rejects a cross-project parent, a foreign `project_id` and a `project_id` change, including through generic `createDocument`/`updateDocumentById`; **RLS isolation**: user B cannot read, rename, delete or create a document in user A's project; sign-up seeds a project |
| Migration | One integration test seeds pre-`024` rows (two users, mixed trees) into a scratch schema, runs the backfill SQL, and checks that every document has its user's project. The backfill is a separate SQL function so it can be tested. |
| Web integration | Projects submenu (switch, create, rename with rollback, delete with typed confirmation), `/` resolution (stored key, stale key, no projects), outline and total word count scoped to the active project |
| Storybook | `ProjectsSubmenu` (one project, several, loading, error), `DeleteProjectDialog` (empty input, matching input, pending) |
| E2E | Create a second project, check that its outline is separate, switch back, reload, and land in the last-used project |

## Delivery

Two PRs. The first one changes nothing the user can see.

1. **Schema and scoping:** migration `024`, the trigger, `create_node`,
   `create_project`, the sign-up seed, scoped queries, project URLs, the
   redirects, and the real title in the header (read-only). Each user has
   exactly one project, so the app looks the same. Review risk: **high**,
   because it touches every document path.
2. **Projects submenu:** create, rename, switch and delete in the UI, plus the
   e2e journey. Review risk: **low**.

## Boundaries

- **Always:** keep `documents.user_id` as the RLS key; scope every outline
  query by `projectId`; add RLS and an isolation test for `projects`.
- **Ask first:** dropping `documents.user_id`; storing the last project on
  the server; any change to the document editor itself.
- **Never:** let a document's parent or owner disagree with its project;
  delete a project without typed confirmation.

## Not in this spec

- Moving documents between projects, or duplicating a project.
- Sharing or collaboration (one owner per project).
- Archiving, project covers, descriptions, genre or target word counts.
- A projects dashboard or grid page. The user menu's Projects submenu is the switcher.
- Import or export.
- Redirecting old `/document/:id` links. The route is removed; there are no external links to keep working.
- Per-project editor settings (the toolbar stays per user).
