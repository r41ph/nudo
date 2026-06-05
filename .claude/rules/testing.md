---
description: Testing conventions — required-tests matrix, feature DoD, web (Vitest + MSW) and API (Vitest + supertest) layers
paths:
  - 'apps/web/src/**/*.test.ts'
  - 'apps/web/src/**/*.test.tsx'
  - 'apps/web/src/test/**'
  - 'apps/api/src/**'
---

## Philosophy

Risk-based, Testing-Trophy shaped: most value at the integration layer, a thin
e2e layer for critical journeys, unit tests for pure logic. Test observable
behavior, not implementation. Coverage is a diagnostic, never a gate.

## Required-tests matrix

Every change brings the test layer(s) for its type. This is not optional.

| Change type                                | Required tests                                                        |
| ------------------------------------------ | --------------------------------------------------------------------- |
| Pure function / util                       | Unit (`*.test.ts`)                                                    |
| New/changed SQL function or migration      | API integration via GraphQL **+ RLS isolation**                       |
| New/changed Express/auth route             | API integration (supertest) incl. failure cases                       |
| New web feature (component + hook + state) | Web integration (`renderWithProviders` + MSW); unit for pure helpers  |
| New cross-cutting user journey             | Add/extend one e2e happy path                                         |
| Bug fix                                    | Failing regression test at the lowest reproducing layer, **then** fix |

## Feature definition of done

A feature/PR is not done until:

- [ ] The layer(s) the matrix mandates for the change type exist and pass.
- [ ] Any new/changed SQL function or migration has an integration test hitting
      it through GraphQL **and** an RLS-isolation test (user B cannot
      read/update/delete/create on user A's data).
- [ ] Any new/changed Express or auth route has integration tests covering the
      failure cases (400/401/409…), not just the happy path.
- [ ] Bug fixes ship with a regression test that failed before the fix.
- [ ] Unit tests stay DB-free so `pnpm test:api` remains fast.
- [ ] Tests assert observable behavior / DB ground truth, not internals.
- [ ] No test was `.skip`ped or deleted to go green.

## Commands

Run only tests for the files you changed — never the full suite unless asked:

```bash
pnpm vitest run <partial-filename>   # matches against the full file path
pnpm test:web                        # web unit + integration (Vitest)
pnpm test:api                        # API unit only — fast, DB-free
pnpm test:api:int                    # API integration — needs Docker + test DB
pnpm test:db:setup                   # create/migrate the nudo_test database
```

Integration tests need the database up: `pnpm docker:up`, then
`pnpm test:db:setup` once, then `pnpm test:api:int`.

---

## API tests (`apps/api`)

Two separate Vitest configs:

- **Unit** (`*.test.ts`, `vitest.config.ts`): pure logic, no DB. Run by
  `pnpm test:api`. Keep these fast and DB-free.
- **Integration** (`*.integration.test.ts`, `vitest.integration.config.ts`):
  exercise the real Express app and real PostGraphile against `nudo_test`. Run
  by `pnpm test:api:int`. The unit config **excludes** `*.integration.test.ts`.

### Naming & layout

- Integration files end in `*.integration.test.ts`.
- Shared integration harness lives in `apps/api/src/test/`:
  - `db.ts` — `getTestPool()`, the owner connection to `nudo_test`.
  - `seed.ts` — `createUser`, `authHeader`, `createDocument`.
  - `graphql.ts` — `graphql(query, variables, token)` over supertest → `/graphql`.

### Conventions

- Drive behavior through the real path: auth routes via supertest, data through
  `/graphql` (PostGraphile sets `app.current_user_id` from the JWT, so RLS
  applies exactly as in production).
- Assert against **DB ground truth** via `getTestPool()`. That pool connects as
  the table owner, which **bypasses RLS** (policies are `ENABLE`, not `FORCE`) —
  ideal for fast seeding and for verifying that a blocked write really did
  nothing, regardless of whether PostGraphile reported null or an error.
- Each test starts clean: the harness `TRUNCATE`s data tables between tests, so
  don't rely on data left by another test.
- Seed users through real `/auth/register` (`createUser`) so passwords/tokens are
  genuine; seed documents/folders/discussions via direct SQL for speed.

### RLS isolation tests

For any new/changed table or policy, prove tenant isolation: seed data as
user A, then assert user B (with B's token) cannot read, update, delete, or
create against it. Reads should return `null`; writes must leave the row
unchanged (verify via `getTestPool()`).

Write each assertion so that disabling the policy makes it fail
(`ALTER TABLE <t> DISABLE ROW LEVEL SECURITY` is the negative control). Never
add application-layer ownership filtering to pass an RLS test — fix the policy.

### Test database — never the dev DB

Integration/e2e point **only** at `nudo_test`. Never run them against the dev
database. Never commit secrets in fixtures (the repo will be public).

---

## Web tests (`apps/web`)

API tests never use MSW; web tests never touch a real database.

### MSW

All GraphQL requests are intercepted at the network level — web tests never call
the real API.

- Handlers: `apps/web/src/test/mocks/`
- Setup (`src/test/setup.ts`) starts MSW before all tests and resets handlers
  between tests.
- Override a handler in a single test: call `server.use(http.post(...))` inside
  the test body — it resets automatically afterward.

### Conventions

- Tests live co-located with their component: `my-component.test.tsx` next to
  `my-component.tsx`.
- Use Testing Library semantic queries (`getByRole`, `findByText`) — avoid
  `getByTestId` unless no semantic alternative works.
- Never mock modules when MSW can intercept the network request instead.
- Don't write jsdom tests for pure CSS hover/visibility — they only assert class
  names, not behavior.

---

## Ask first

- Adding a test dependency beyond supertest/Playwright.
- Adding a top-level `pnpm` script or changing `test:api` semantics.
- Any schema/migration change driven purely by test needs.
- Introducing coverage thresholds that gate builds (out of scope for now).
