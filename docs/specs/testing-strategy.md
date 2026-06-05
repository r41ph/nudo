# Spec: Testing Strategy

> Status: Draft — awaiting approval
> Branch: TBD (proposed `chore/testing-strategy`)
> Scope: Phases 0–2 (static base + unit + API-integration harness + per-feature
> rules). The e2e layer and coverage diagnostic are a follow-up PR — see
> [`testing-strategy-e2e.md`](./testing-strategy-e2e.md).

## Objective

Establish a coherent, risk-based testing strategy for the whole monorepo and a
repeatable per-feature workflow so that every new feature ships with the right
test types — no more, no less.

We are **not** chasing a coverage number. We optimize for **confidence in
critical user workflows**: a large body of integration tests, a small number of
targeted end-to-end tests, focused unit tests for pure logic, and static
analysis as the base. Coverage is a **diagnostic** to find untested risk, not a
target to maximize. This spec delivers the static, unit, and API-integration
layers plus the per-feature rules; the targeted e2e layer and the coverage
diagnostic are scoped in [`testing-strategy-e2e.md`](./testing-strategy-e2e.md).

### Users

Repo contributors (today: one developer + AI agents). The strategy must be
cheap to follow on every feature, not a separate "testing project."

### Why now

- `apps/web` has a healthy integration setup (Vitest + MSW + Testing Library),
  but `apps/api` has only **4 pure-unit test files (~221 lines)**. Nothing
  exercises the running Express app, the auth routes end-to-end, PostGraphile,
  the ~10 SQL functions, or **row-level security** — the database enforces
  ownership and that guarantee is completely untested.
- There is **no end-to-end layer** at all — no test proves the core journey
  (login → open document → edit → autosave persists) actually works.
- `.claude/rules/testing.md` documents only web Vitest/MSW conventions. There is
  no rule defining **which test types are required per change**, so coverage of
  new features is ad hoc.

### Success criteria

- [ ] A documented testing pyramid (Trophy) with a clear "what to test where"
      rule that contributors and agents follow without re-deriving it.
- [ ] API integration tests run against a **real Postgres test database** with
      all migrations applied, covering: auth routes (incl. failure paths + token
      rotation), the SQL-function-backed GraphQL mutations, and **RLS isolation**
      (user A cannot read or mutate user B's data).
- [ ] `.claude/rules/testing.md` expanded into the source of truth for the
      per-feature workflow, with a required-tests matrix and a definition-of-done
      checklist. CLAUDE.md points to it.
- [ ] New `pnpm` scripts make each layer runnable in isolation, with unit tests
      staying fast (no DB) and API integration gated behind the test DB.
- [ ] No flakiness: test DB has deterministic per-test isolation.

The targeted e2e layer and the `test:coverage` diagnostic are tracked separately
in [`testing-strategy-e2e.md`](./testing-strategy-e2e.md).

## Tech Stack

Reuse what exists; add the minimum.

| Concern                               | Tool                                                                  | Status                                        |
| ------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| Static base                           | TypeScript (strict) + ESLint                                          | exists (pre-push `typecheck`)                 |
| Unit + web/API integration            | Vitest `^4`                                                           | exists                                        |
| Web component/feature integration     | Testing Library + MSW `^2`                                            | exists                                        |
| API HTTP integration                  | **supertest** + real Postgres test DB                                 | **new dep** (`supertest`, `@types/supertest`) |
| Test DB migration                     | the existing `pnpm db:migrate` step, invoked with `DB_NAME=nudo_test` | exists (reused as-is)                         |
| Test DB lifecycle (create + truncate) | `pg` + raw SQL — new test-only helpers                                | **new**                                       |

The e2e browser (Playwright) and the coverage diagnostic are scoped in the
follow-up spec, [`testing-strategy-e2e.md`](./testing-strategy-e2e.md).

No PostGraphile resolvers are hand-written, so API "logic" lives in SQL
functions + RLS — which is exactly why integration (not unit) is the right layer
for the API.

## Commands

```bash
# --- existing ---
pnpm test:web                  # web unit + integration (Vitest + MSW)
pnpm test:api                  # API UNIT only — fast, no DB (redefined below)
pnpm lint                      # ESLint (static base)
pnpm typecheck                 # tsc across workspaces (static base)
pnpm docker:up                 # start Postgres (needed for integration/e2e)

# --- new ---
pnpm test:db:setup             # create + migrate the nudo_test database
pnpm test:api:int              # API integration tests (supertest + real test DB)

# filter a single file (unchanged convention)
pnpm vitest run <partial-filename>
```

`pnpm test:e2e` and `pnpm test:coverage` arrive with the follow-up spec,
[`testing-strategy-e2e.md`](./testing-strategy-e2e.md).

`pnpm test:api` is narrowed to unit-only (glob excludes `*.integration.test.ts`)
so the fast inner loop never needs Docker. Integration is opt-in via
`test:api:int`.

## Project Structure

```
apps/api/src/
  app.ts                       → NEW: createApp() factory (assembly only, no listen)
  index.ts                     → imports createApp(), calls .listen()
  **/*.test.ts                 → UNIT tests (pure, no DB)
  **/*.integration.test.ts     → API INTEGRATION (supertest + real test DB)
  test/
    db.ts                      → test-DB connect/migrate/truncate helpers
    seed.ts                    → typed seed helpers (createUser, createDocument…)
    setup.integration.ts       → Vitest setup: ensure DB migrated, truncate per test

apps/web/src/
  **/*.test.{ts,tsx}           → unit + feature-integration (existing pattern)
  test/                        → existing MSW harness (unchanged)

docs/specs/testing-strategy.*      → this spec, its plan, its tasks
docs/specs/testing-strategy-e2e.*  → follow-up spec: e2e layer + coverage
.claude/rules/testing.md           → EXPANDED: per-feature required-tests matrix
```

The `e2e/` package is added by the follow-up spec,
[`testing-strategy-e2e.md`](./testing-strategy-e2e.md).

## Code Style

**API integration — drive the real app over HTTP, assert real DB behavior incl. RLS:**

```ts
// apps/api/src/features/documents/document.integration.test.ts
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@api/app.js';
import { createUser, authHeader } from '@api/test/seed.js';

const app = createApp();

describe('document RLS', () => {
  it("does not let user B read user A's document", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const { body } = await request(app)
      .post('/graphql')
      .set(authHeader(alice))
      .send({ query: CREATE_DOCUMENT, variables: { title: 'Secret' } });
    const id = body.data.createNewDocument.document.id;

    const res = await request(app)
      .post('/graphql')
      .set(authHeader(bob))
      .send({ query: GET_DOCUMENT, variables: { id } });

    expect(res.body.data.documentById).toBeNull(); // RLS hides it
  });
});
```

**Web integration — behavior through real providers + MSW, semantic queries (unchanged):**

```tsx
import { renderWithProviders } from '@web/test/test-utils';

it('shows the document title after load', async () => {
  renderWithProviders(<DocumentPage />, { initialRoute: '/document/doc-1' });
  expect(await screen.findByRole('heading', { name: /my doc/i })).toBeVisible();
});
```

Conventions: kebab-case files; `*.integration.test.ts` for DB-backed API tests;
co-located tests; Testing Library semantic queries; never mock what MSW (web) or
the real test DB (api) can provide; test observable behavior, not internals.

## Testing Strategy

The Trophy, applied to this repo:

| Layer                      | What goes here                                                                                          | Where                                         | How much                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Static**                 | types, lint                                                                                             | `tsc`, ESLint (pre-push)                      | always on                                                                                      |
| **Unit**                   | pure functions, edge cases (`wordCount`, `extractPlainText`, token signing, tree utils)                 | co-located `*.test.ts(x)`                     | thin — only pure logic                                                                         |
| **Integration** (the bulk) | web: feature render + MSW. api: supertest + real test DB exercising SQL functions, auth routes, **RLS** | web `*.test.tsx`; api `*.integration.test.ts` | **most effort here**                                                                           |
| **E2E** (targeted)         | full-stack critical journeys in a real browser                                                          | `e2e/tests/`                                  | **few** — happy paths only (follow-up: [`testing-strategy-e2e.md`](./testing-strategy-e2e.md)) |

The **E2E** tier and the coverage diagnostic are delivered by the follow-up spec,
[`testing-strategy-e2e.md`](./testing-strategy-e2e.md); this spec covers Static,
Unit, and Integration.

**Test DB lifecycle:** one `nudo_test` database in the existing Docker
Postgres. Three steps, only two of which are test-specific:

1. **Create** (test-only): `CREATE DATABASE nudo_test` via a `pg` client
   on the `postgres` maintenance DB, if absent. The normal migrate flow does not
   create databases.
2. **Migrate** (reused as-is): run the existing `pnpm db:migrate` step with
   `DB_NAME=nudo_test` in the env. `config/db.ts` derives `DATABASE_URL`
   from `DB_NAME`, and `env.ts`'s `dotenv` does not override an already-set var,
   so the test DB name wins — no change to `run-migrate.ts`.
3. **Truncate** (test-only): each test starts clean via
   `TRUNCATE <data tables> RESTART IDENTITY CASCADE` (the `node-pg-migrate`
   migrations table is preserved, so we migrate once, not per test).

RLS is exercised through the real GraphQL path (PostGraphile sets
`app.current_user_id` from the JWT); direct-SQL function tests set it via
`SET LOCAL app.current_user_id` inside a transaction.

The critical e2e journeys this strategy ultimately proves are listed in the
follow-up spec, [`testing-strategy-e2e.md`](./testing-strategy-e2e.md).

## Boundaries

**Always**

- Add the test layer(s) the required-tests matrix mandates for the change type.
- For any new/changed SQL function or migration, add an API integration test
  that hits it via GraphQL **and** asserts RLS isolation.
- For any bug fix, first add a failing regression test at the lowest layer that
  reproduces it (Prove-It), then fix.
- Keep unit tests DB-free so `pnpm test:api` stays fast.

**Ask first**

- Adding a new test dependency beyond supertest/Playwright.
- Adding a new top-level `pnpm` script or changing `test:api` semantics.
- Any schema/migration change driven purely by test needs.
- Introducing coverage thresholds that gate builds (currently out of scope).

**Never**

- Hand-write PostGraphile resolvers to make a test easier.
- Add application-layer ownership filtering to pass an RLS test — fix the policy.
- Point integration/e2e at the dev database — only `nudo_test`.
- Delete or `.skip` a failing test to go green without explicit approval.
- Commit secrets in fixtures (repo will be public).

## Success Criteria

See checkboxes under **Objective**. Concretely, "done" =
`createApp()` extracted; `test:db:setup` + `test:api:int` green with RLS-isolation
tests passing; `.claude/rules/testing.md` holds the required-tests matrix + DoD
checklist; CLAUDE.md links it. (The e2e journeys and coverage diagnostic close
out in [`testing-strategy-e2e.md`](./testing-strategy-e2e.md).)

## Backfill scope

The per-feature workflow requires every new or changed unit of code to bring its
tests. Separately, for code that already exists without tests: we **enforce
forward and backfill the highest-risk gaps only** — auth and RLS first. We do
not pause to retro-fit the entire existing web + API surface; low-risk untested
code gains coverage when it is next touched.
