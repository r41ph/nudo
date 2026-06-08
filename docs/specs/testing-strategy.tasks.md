# Tasks: Testing Strategy

> Status: Implemented (PR #22 — https://github.com/r41ph/nudo/pull/22)
> Spec: [`testing-strategy.md`](./testing-strategy.md)
> Plan: [`testing-strategy.plan.md`](./testing-strategy.plan.md)
> Branch: `chore/testing-strategy` (merged in #22)
> Scope: Phases 0–2. Phase 3 (e2e) and Phase 4 (coverage close-out) tasks live in
> [`testing-strategy-e2e.tasks.md`](./testing-strategy-e2e.tasks.md).

Tasks are ordered by dependency. Each is independently verifiable. No task
touches more than ~5 files.

---

## Phase 0 — Enabling refactor

### Task 0.1 — Extract `createApp()` factory

- **Acceptance:** `apps/api/src/app.ts` exports `createApp(): Express` with the
  exact middleware assembly currently in `index.ts`; `index.ts` only resolves
  the port and calls `createApp().listen(...)`. No behavior change.
- **Verify:** `pnpm dev:api` boots and serves `/graphiql`; `pnpm typecheck` green.
- **Files:** `apps/api/src/app.ts` (new), `apps/api/src/index.ts`.

## Phase 1 — API integration harness + tests

### Task 1.1 — Add integration deps

- **Acceptance:** `supertest` + `@types/supertest` in `apps/api` devDeps.
- **Verify:** `pnpm install` clean; `pnpm typecheck` green.
- **Files:** `apps/api/package.json`, `pnpm-lock.yaml`.

### Task 1.2 — Test DB lifecycle helpers

- **Acceptance:** `apps/api/src/test/db.ts` can create `nudo_test`,
  apply all migrations, and `truncateAll()` data tables (preserving the
  migrations table) with `RESTART IDENTITY CASCADE`.
- **Verify:** a throwaway script / first integration test confirms a clean DB
  between runs.
- **Files:** `apps/api/src/test/db.ts` (new). No change to `run-migrate.ts` —
  it is invoked as the existing `pnpm db:migrate` step with `DB_NAME=nudo_test`.

### Task 1.3 — Integration Vitest config + scripts

- **Acceptance:** `test:api` excludes `*.integration.test.ts` (stays DB-free);
  `test:api:int` runs only them with `DB_NAME=nudo_test`;
  `test:db:setup` creates+migrates the test DB. Root scripts mirror these.
- **Verify:** `pnpm test:api` runs the 4 existing unit files only;
  `pnpm test:api:int` picks up integration files.
- **Files:** `apps/api/vitest.integration.config.ts` (new),
  `apps/api/package.json`, root `package.json`,
  `apps/api/src/test/setup.integration.ts` (new).

### Task 1.4 — Seed helpers

- **Acceptance:** `createUser()` returns a user + valid JWT (via the real
  register route), `authHeader(user)`, `createDocument()`.
- **Verify:** used by Task 1.5 tests; green.
- **Files:** `apps/api/src/test/seed.ts` (new).

### Task 1.5 — RLS isolation tests (highest risk first)

- **Acceptance:** tests prove user B cannot read/update/delete user A's
  document, folder, and discussion via GraphQL, and cannot create a discussion
  attached to user A's document.
- **Verify:** `pnpm test:api:int` green; removing the RLS policy makes them fail.
- **Files:** `apps/api/src/**/<entity>.integration.test.ts` (1–2 files).

### Task 1.6 — Auth route tests

- **Acceptance:** register, login (good/bad creds), refresh rotation, logout;
  missing/expired token → 401.
- **Verify:** `pnpm test:api:int` green.
- **Files:** `apps/api/src/auth/auth.integration.test.ts` (new).

### Task 1.7 — SQL-function mutation tests

- **Acceptance:** GraphQL coverage for `create_new_document`,
  `update_document_content` (asserts word count + a version row),
  `restore_document_version`, `create_new_folder`, reorder/move,
  `update_user_toolbar`, `prune_orphaned_discussions`.
- **Verify:** `pnpm test:api:int` green.
- **Files:** 2–3 `*.integration.test.ts` files grouped by domain.

## Phase 2 — Rules & per-feature workflow

### Task 2.1 — Expand `.claude/rules/testing.md`

- **Acceptance:** contains the required-tests matrix, a feature DoD checklist,
  API integration + RLS + test-DB conventions, and `*.integration.test.ts`
  naming. `paths:` frontmatter also matches `apps/api/src/**`.
- **Verify:** rule auto-loads when an `apps/api/src` file is read; read-through.
- **Files:** `.claude/rules/testing.md`.

### Task 2.2 — Point CLAUDE.md at the rule

- **Acceptance:** the Testing section references the matrix/DoD in the rule;
  documents new scripts.
- **Verify:** read-through.
- **Files:** `CLAUDE.md` (and `apps/api/CLAUDE.md` if useful).

## Follow-up (separate PR)

Phase 3 (e2e scaffold + critical-journey specs) and Phase 4 (coverage diagnostic

- spec close-out) are tracked in
  [`testing-strategy-e2e.tasks.md`](./testing-strategy-e2e.tasks.md).
