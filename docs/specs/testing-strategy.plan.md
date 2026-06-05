# Plan: Testing Strategy

> Status: Draft — awaiting approval
> Spec: [`testing-strategy.md`](./testing-strategy.md)
> Branch: TBD (proposed `chore/testing-strategy`)
> Scope: Phases 0–2. The e2e layer (Phase 3) and coverage close-out (Phase 4)
> are planned in [`testing-strategy-e2e.plan.md`](./testing-strategy-e2e.plan.md).

## Approach summary

Build the missing layers in the order of risk reduction you chose — **API
integration first** (the biggest gap: RLS, SQL functions, auth), then the
per-feature rules. A thin e2e layer and the coverage diagnostic follow in a
separate PR. Each phase is independently mergeable and leaves the repo green.

```
Phase 0  Enabling refactor  →  Phase 1  API integration harness + tests
                                   │
                                   ▼
                            Phase 2  Rules & per-feature workflow

[follow-up PR] Phase 3  E2E layer  →  Phase 4  Coverage + close-out
               (see testing-strategy-e2e.*)
```

## Phase 0 — Enabling refactor (no behavior change)

Extract the Express app so it can be driven by supertest without a listener.

- `apps/api/src/app.ts` exports `createApp(): Express` containing the current
  assembly from `index.ts` (cors, `/auth`, authMiddleware, postgraphile).
- `index.ts` becomes: `createApp().listen(port, …)`.
- **Risk:** low. **Verify:** `pnpm dev:api` still boots; `pnpm typecheck` green.

## Phase 1 — API integration harness + tests (priority)

The core of the effort. Build the test-DB harness, then cover the biggest risks.

1. **Add deps:** `supertest`, `@types/supertest` (devDeps in `apps/api`).
2. **Test DB lifecycle** (`apps/api/src/test/db.ts`):
   - Connect to the `postgres` maintenance db, `CREATE DATABASE nudo_test` if
     absent.
   - Migrate it by invoking the **existing** `pnpm db:migrate` step with
     `DB_NAME=nudo_test` in the child env — no change to `run-migrate.ts`
     (it derives `DATABASE_URL` from `DB_NAME`, and `dotenv` won't override an
     already-set var).
   - `truncateAll()` → `TRUNCATE <data tables> RESTART IDENTITY CASCADE`,
     preserving the `node-pg-migrate` migrations table.
3. **Env wiring:** Vitest integration config sets `DB_NAME=nudo_test` via
   `test.env`. `config/env.ts` uses `dotenv` (which does **not** override
   already-set vars), so the test value wins — confirmed by reading `env.ts`.
4. **Seed helpers** (`apps/api/src/test/seed.ts`): `createUser()` (register via
   the real route to get a valid JWT), `authHeader(user)`, `createDocument()`.
5. **Vitest setup** (`setup.integration.ts`): ensure migrated once
   (global setup); `truncateAll()` in `beforeEach`.
6. **Split configs/scripts:** `test:api` excludes `*.integration.test.ts`;
   new `test:api:int` runs only them; new `test:db:setup`.
7. **Write the high-value tests** (ordered by risk):
   - **RLS isolation** — user B cannot read/update/delete user A's documents,
     folders, discussions.
   - **Auth routes** — register, login (good/bad creds), refresh rotation,
     logout; missing/expired token → 401.
   - **SQL-function mutations** via GraphQL — `create_new_document`,
     `update_document_content` (word count + version row written),
     `restore_document_version`, `create_new_folder`,
     `move_and_reorder_document` / `reorder_folders`,
     `update_user_toolbar`, `prune_orphaned_discussions`.

- **Risk:** medium — isolation/flakiness is the main hazard; truncate-per-test
  mitigates. **Verify:** `pnpm docker:up && pnpm test:db:setup && pnpm test:api:int`
  green; `pnpm test:api` still fast and DB-free.

## Phase 2 — Rules & per-feature workflow

Codify so every future feature follows clear steps.

- Expand `.claude/rules/testing.md` with:
  - **Required-tests matrix** (change type → mandated layers).
  - **Definition-of-done checklist** for a feature PR.
  - API integration + RLS conventions; test-DB usage; naming
    (`*.integration.test.ts`).
  - Update `paths:` frontmatter to also match `apps/api/src/**`.
- Add a short pointer in `CLAUDE.md` ("Testing" section → see the rule).

Required-tests matrix (draft):

| Change type                            | Required tests                                                       |
| -------------------------------------- | -------------------------------------------------------------------- |
| Pure function / util                   | Unit (`*.test.ts`)                                                   |
| New/changed SQL function or migration  | API integration via GraphQL **+ RLS isolation**                      |
| New/changed Express/auth route         | API integration (supertest) incl. failure cases                      |
| New web feature (component+hook+state) | Web integration (`renderWithProviders` + MSW); unit for pure helpers |
| New cross-cutting user journey         | Add/extend one e2e happy path                                        |
| Bug fix                                | Failing regression test at the lowest reproducing layer, then fix    |

- **Risk:** none (docs). **Verify:** rule auto-loads on matching file reads; peer
  read-through.

## Follow-up (separate PR)

Phase 3 (E2E layer, Playwright) and Phase 4 (coverage diagnostic + close-out)
are planned in [`testing-strategy-e2e.plan.md`](./testing-strategy-e2e.plan.md).
Phase 3 needs Phase 0 (the `createApp()` factory) but not Phases 1–2.

## Sequencing & parallelism

- Phase 0 must land before Phase 1.
- Phase 2 can be written in parallel with Phase 1 but should reflect the final
  harness names — land it after Phase 1 stabilizes.

## CI readiness (not built now)

No CI yet (per your note). Each new command is CI-friendly: `docker:up` →
`test:db:setup` → `test:api:int`. When CI lands, these become jobs; the e2e and
coverage commands from the follow-up PR slot in the same way.
