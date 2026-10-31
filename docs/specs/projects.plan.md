# Plan: Projects

> Status: Implemented — PR 1 merged (PR #44 — https://github.com/r41ph/nudo/pull/44); PR 2 merged (PR #47 — https://github.com/r41ph/nudo/pull/47)
> Spec: [`projects.md`](./projects.md)
> Branch: `feat/projects`

## Approach summary

| #   | Piece              | File(s)                                                          | Mechanism                                                                                                                  |
| --- | ------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A   | Schema             | `apps/api/src/db/migrations/024_create-projects.ts`              | `projects` table + RLS, nullable `documents.project_id`, backfill, then `SET NOT NULL`                                     |
| B   | Backfill           | same migration, `backfill_projects()`                            | A plain SQL function the migration calls once, kept (omitted from GraphQL, no visitor grant) so the test can call it again |
| C   | Integrity          | `documents_check_project` trigger                                | Same shape as `documents_check_parent` in `022`                                                                            |
| D   | Creation paths     | `create_node` (new signature), `create_project`, `auth/routes.ts` | Every insert names a project; the old `create_node` overload is dropped                                                    |
| E   | Active project     | `shared/hooks/use-project-id.ts`, `router.tsx`                   | The route param is the only source; no atom                                                                                |
| F   | Scoped queries     | `outline.api.ts`, `document.api.ts`, hooks                       | `condition: { projectId }`; keys `['outline', projectId]`, `['documents', projectId]`                                      |
| G   | Projects submenu   | `features/project/components/projects-submenu.tsx`               | `DropdownMenuSub` inside `SidebarFooterActions`                                                                            |

## Why these mechanisms

### A — add nullable, backfill, then `NOT NULL`

Adding `project_id NOT NULL` in one step fails on any database with rows. The
migration runs in one transaction, so the three steps are atomic: either every
document gets a project or nothing changes.

### B — a backfill function the test can call

The spec asks for a tested backfill. After `024` runs, `project_id` is
`NOT NULL`, so the test can't recreate "documents without a project" in
`public`. The test instead builds a scratch schema (`CREATE TABLE … (LIKE
public.documents INCLUDING DEFAULTS)` with a nullable `project_id`), sets
`search_path` to it and calls `backfill_projects()`.

- The function therefore uses **unqualified** names and does **not** pin
  `search_path`. That is safe because it is not `SECURITY DEFINER` and the
  visitor role can't run it.
- `REVOKE EXECUTE … FROM nudo_visitor, PUBLIC` undoes `008`'s default
  `GRANT EXECUTE ON FUNCTIONS`, and `COMMENT … IS E'@omit'` keeps it out of
  the GraphQL schema.

### C — the trigger, not just the functions

PostGraphile exposes generic `createDocument` and `updateDocumentById`, so a
check inside `create_node` alone can be bypassed. Same reasoning as `022`.

### D — `create_project` only, no generic `createProject`

`projects` gets `COMMENT ON TABLE projects IS E'@omit create'`. A project
created through the generic mutation would have no starter documents, which
the spec forbids. `updateProjectById` and `deleteProjectById` stay exposed.
The update policy copies `documents_update_own`: with no `WITH CHECK`,
Postgres applies the `USING` expression to the new row as well, so a patch
can't hand a project to another user.

### E — the URL owns the active project

An atom would need syncing with the URL, which `.claude/rules/state.md`
forbids doing through effects. `useProjectId()` reads `useParams()`; a
component outside a project route gets `undefined` and must handle it.

### F — prefix-matched keys

Every existing `invalidateQueries({ queryKey: ['outline'] })` keeps working
because TanStack matches by prefix, so only the `useQuery` call sites change.

## Phases

PR 1 = phases 1–3. PR 2 = phases 4–5. PR 1 changes nothing the user can
see except the real title in the header and the URLs.

### Phase 1 — Schema (PR 1)

1. `projects.integration.test.ts` red first: `create_project` seeds the
   tree; trigger rejections (including through generic mutations); RLS
   isolation; cascade on delete; sign-up seeds a project; backfill on a
   scratch schema.
2. `024_create-projects.ts`, then `pnpm db:migrate` + `pnpm test:api:int`.
3. Update `auth/routes.ts`, `test/seed.ts` (`createDocument` needs a
   project) and the existing integration tests that call `createNode`.

About 4–5 hours. Most of it is the integration test.

### Phase 2 — Routing and scoping (PR 1)

1. `useProjectId()` + test.
2. Routes: `/` → `project-redirect.tsx`; `/project/:projectId` → today's
   `HomePage` (first document, or the existing empty state, now scoped);
   `/project/:projectId/document/:documentId` → `DocumentPage`. The
   `/document/:id` route is removed.
3. `GET_PROJECTS`; scope `GET_OUTLINE`, `GET_DOCUMENTS` and `CREATE_NODE`;
   update every URL builder (`home-page.tsx`, `draft-section.tsx`,
   `document-page.tsx`).
4. MSW fixtures and handlers gain projects and the `projectId` filter.

About 3–4 hours.

### Phase 3 — Real title in the header (PR 1)

`ProjectHeader` reads `['projects']`: **Manuscript** label, title, skeleton,
error with Retry. `"Project Alpha"` is deleted. Story updated.

About 1 hour.

### Phase 4 — Projects submenu (PR 2)

`ProjectsSubmenu`, `ProjectTitleDialog`, `DeleteProjectDialog`, the
mutations hook, and the `/` empty state with **Create a project**. That
state can't be reached until a project can be deleted, so it ships here.

About 4 hours.

### Phase 5 — E2E and close-out (PR 2)

`e2e/tests/projects.spec.ts`; status lines and PR links in the spec, the
plan and the tasks file.

About 1–2 hours.

## Risks / watch items

1. **Every document path changes in PR 1.** Mitigation: the integration
   suite already covers outline, documents and RLS; those tests are updated,
   not replaced, so a regression shows up as a red test.
2. **`seed.ts` raw inserts.** `createDocument` inserts with only `user_id`
   and `title`. After `024` that fails `NOT NULL`. It needs the user's
   project, looked up from the one sign-up created.
3. **Overload exposure.** If the old `create_node` isn't dropped, PostGraphile
   exposes two `createNode` mutations with clashing names. `012` hit this.
4. **Stale `nudo:last-project`.** It may point to a deleted project or one
   from another account on a shared browser. `/` checks it against
   `allProjects` (RLS-scoped) before using it.

## Verification

```bash
pnpm docker:up && pnpm db:migrate
pnpm test:db:setup && pnpm test:api:int
pnpm test:web project outline draft-section home-page document-page sidebar
pnpm test:e2e
pnpm typecheck
```

By hand in `pnpm dev`: an existing account lands in "Untitled manuscript"
with its documents intact.

## Out of plan

Everything under "Not in this spec" in `projects.md`.
