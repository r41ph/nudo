# Tasks: Projects

> Status: In review — PR 1 merged (PR #44 — https://github.com/r41ph/nudo/pull/44); PR 2 in review (PR #47 — https://github.com/r41ph/nudo/pull/47)
> Spec: [`projects.md`](./projects.md)
> Plan: [`projects.plan.md`](./projects.plan.md)
> Branch: `feat/projects`

Each task can be verified on its own and touches about 5 files or fewer.
Every phase ends with the tests passing. PR 1 = phases 1–3, PR 2 = phases 4–5.

---

## Phase 1 — Schema (PR 1)

### Task 1.1 — Integration test (red first)

- **Acceptance:** `projects.integration.test.ts` covers:
  - `create_project` returns the project and seeds "Chapter One" containing
    "Untitled";
  - `create_node` with `nodeProjectId` puts the node in that project, with
    positions counted per project;
  - the trigger rejects a cross-project parent, a project owned by another
    user and a `project_id` change, including through the generic
    `createDocument`/`updateDocumentById`;
  - RLS: user B can't read, rename, delete or add a document to user A's
    project;
  - deleting a project cascades to its documents, versions and discussions;
  - generic `createProject` isn't in the schema;
  - sign-up seeds one project that holds the welcome tree.
- **Verify:** `pnpm test:api:int projects`. It fails because `projects`
  doesn't exist yet.
- **Files:** `apps/api/src/test/projects.integration.test.ts`.

### Task 1.2 — Backfill test (red first)

- **Acceptance:** the test builds a scratch schema with `users`, `projects`
  and a `documents` copy whose `project_id` is nullable. It seeds two users
  with mixed trees and one user with none, sets `search_path`, and calls
  `backfill_projects()`. Then it checks that every document has its own
  user's project, that each user has exactly one project, and that the
  user without documents also got one. The scratch schema is dropped in
  `afterAll`.
- **Verify:** `pnpm test:api:int projects`, which fails because there's no
  `backfill_projects`.
- **Files:** `apps/api/src/test/projects-backfill.integration.test.ts`.

### Task 1.3 — Migration 024

- **Acceptance:**
  - `projects` table per the spec, with an index on `user_id`, the four
    `projects_*_own` policies and `@omit create`.
  - A `BEFORE UPDATE OF title` trigger touches `updated_at`.
  - `documents.project_id` is added nullable, `backfill_projects()` runs,
    then the column is set `NOT NULL`, with the
    `(project_id, parent_id, position)` index.
  - `backfill_projects()` is revoked from `nudo_visitor` and `PUBLIC` and
    marked `@omit`.
  - `documents_check_project` trigger, with `pg_catalog, public` pinned.
  - The old `create_node` is dropped and the new one is created with
    `node_project_id`.
  - `create_project(project_title)`.
  - Forward-only, with no `down()`.
- **Verify:** `pnpm db:migrate`, then `pnpm test:api:int projects`: the
  schema assertions pass. Sign-up and the old suites stay red until 1.4.
- **Files:** `apps/api/src/db/migrations/024_create-projects.ts`.

### Task 1.4 — Sign-up and test helpers

- **Acceptance:**
  - Sign-up inserts the project inside the existing seed transaction, and
    both seed inserts carry `project_id`.
  - `seed.ts` gets `getProjectId(user)`, and `createDocument` uses it.
  - Every existing `createNode` call in the tests passes `nodeProjectId`.
- **Verify:** the whole `pnpm test:api:int` passes.
- **Files:** `apps/api/src/auth/routes.ts`, `apps/api/src/test/seed.ts`,
  `outline.integration.test.ts`, `document-details.integration.test.ts`,
  `rls.integration.test.ts`.

---

## Phase 2 — Routing and scoping (PR 1)

### Task 2.1 — `useProjectId` and project queries

- **Acceptance:**
  - `useProjectId()` returns the `:projectId` param, or `undefined` outside
    a project route.
  - `GET_PROJECTS` is added, plus `useProjects()` on the key `['projects']`.
  - MSW fixtures gain one project, and the handlers answer `GetProjects`.
- **Verify:** `pnpm test:web use-project-id use-projects`.
- **Files:** `shared/hooks/use-project-id.ts` (+ test),
  `features/project/api/project.api.ts`,
  `features/project/hooks/use-projects.ts` (+ test),
  `test/mocks/{fixtures,handlers}.ts`.

### Task 2.2 — Scope the outline and documents

- **Acceptance:**
  - `GET_OUTLINE` and `GET_DOCUMENTS` take `$projectId` and use
    `condition: { projectId }`, with keys `['outline', projectId]` and
    `['documents', projectId]`.
  - `CREATE_NODE` passes `nodeProjectId`.
  - The MSW handlers filter by `projectId`.
  - The total word count and POV suggestions read the scoped outline.
- **Verify:** `pnpm test:web draft-section document-page use-pov-suggestions word-count`.
- **Files:** `shared/api/outline.api.ts`,
  `features/document/api/document.api.ts`,
  `features/document/hooks/document.hooks.ts`,
  `features/document/hooks/use-pov-suggestions.ts`,
  `features/sidebar/components/sections/draft-section.tsx`.

### Task 2.3 — Project routes

- **Acceptance:**
  - `/` renders `ProjectRedirect`. It uses `nudo:last-project` (read inside
    `try/catch`) when that project is in `allProjects`. Otherwise it uses
    the newest project. It shows a loading state and an error with Retry.
  - `/project/:projectId` renders `HomePage`, scoped to the project.
  - `/project/:projectId/document/:documentId` renders `DocumentPage`, and
    opening it writes the localStorage key.
  - `/document/:id` is gone.
  - Every `navigate()` and `<Navigate>` builds project URLs.
  - A foreign or unknown `projectId` shows the not-found state.
- **Verify:** `pnpm test:web project-redirect home-page document-page draft-section`.
  Then `pnpm test:e2e`: the existing journeys still pass.
- **Files:** `app/routes/router.tsx`,
  `features/project/components/project-redirect.tsx` (+ test),
  `features/home/components/home-page.tsx`,
  `features/document/components/document-page.tsx`,
  `features/sidebar/components/sections/draft-section.tsx`.

---

## Phase 3 — Real title (PR 1)

### Task 3.1 — `ProjectHeader` reads the project

- **Acceptance:**
  - `ProjectHeader` has no `name` prop. It shows the **Manuscript** label
    and the active project's title.
  - It shows a `Skeleton` while loading, and "Couldn't load projects" with
    Retry on error.
  - `grep -r "Project Alpha"` finds nothing.
  - The story covers loaded, loading and error.
- **Verify:** `pnpm test:web project-header app-sidebar`; `pnpm storybook`.
- **Files:** `features/sidebar/components/project-header.tsx` (+ test),
  `features/sidebar/components/app-sidebar.tsx`,
  `packages/ui/stories/project-header.stories.tsx`.

**PR 1 checkpoint:** push and open the PR. By hand, an existing account
lands in "Untitled manuscript" with every document intact.

---

## Phase 4 — Projects submenu (PR 2)

### Task 4.1 — Mutations hook

- **Acceptance:**
  - `useProjectMutations()` exposes create (`create_project`, then navigate
    to its first document), rename (optimistic on `['projects']`, rolled
    back on error) and delete (navigate to the next project, or to `/`).
  - Every `onError` shows a toast with an `id`.
- **Verify:** `pnpm test:web use-project-mutations`.
- **Files:** `features/project/hooks/use-project-mutations.ts` (+ test),
  `features/project/api/project.api.ts`, `test/mocks/handlers.ts`.

### Task 4.2 — Dialogs

- **Acceptance:**
  - `ProjectTitleDialog` (create and rename) rejects an empty or
    whitespace-only title inline, shows a pending state, and on failure
    stays open with an inline error.
  - `DeleteProjectDialog` names the document count. Its button stays
    disabled until the typed title matches, ignoring case and surrounding
    whitespace.
  - Both have stories.
- **Verify:** `pnpm test:web delete-project-dialog project-title-dialog`.
- **Files:** `features/project/components/{project-title-dialog,delete-project-dialog}.tsx`
  (+ tests), `packages/ui/stories/delete-project-dialog.stories.tsx`.

### Task 4.3 — Submenu in the user menu

- **Acceptance:**
  - **Projects ▸** sits after Dark mode.
  - The submenu has radio items for the projects, a separator, then New
    project…, Rename "<title>"… and Delete "<title>"….
  - While loading it shows a disabled "Loading projects…" item; on error it
    shows "Couldn't load projects" and Retry.
  - It works fully from the keyboard.
  - The story covers one project, several, loading and error.
- **Verify:** `pnpm test:web projects-submenu sidebar-footer-actions`.
- **Files:** `features/project/components/projects-submenu.tsx` (+ test),
  `features/sidebar/components/sidebar-footer-actions.tsx`,
  `packages/ui/stories/projects-submenu.stories.tsx`.

### Task 4.4 — "No projects" empty state

- **Acceptance:** with no projects, `/` shows **Create a project**, which
  opens `ProjectTitleDialog`.
- **Verify:** `pnpm test:web project-redirect`.
- **Files:** `features/project/components/project-redirect.tsx` (+ test).

---

## Phase 5 — E2E and close-out (PR 2)

### Task 5.1 — Projects journey

- **Acceptance:** create a second project and check that its outline holds
  only the starter tree. Switch back, reload, and land in the last-used
  project.
- **Verify:** `pnpm test:e2e projects`.
- **Files:** `e2e/tests/projects.spec.ts`.

### Task 5.2 — Link docs and PRs

- **Acceptance:** the `> Status:` lines in the spec, the plan and this file
  name both PRs, and each PR description points at the spec.
- **Files:** `docs/specs/projects{,.plan,.tasks}.md`.
