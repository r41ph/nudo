# Spec: Testing Strategy — E2E Layer & Close-out

> Status: Draft — awaiting approval
> Branch: TBD (follow-up PR, off `main`)
> Builds on: [`testing-strategy.md`](./testing-strategy.md) (Phases 0–2: API
> integration harness + per-feature rules)

## Objective

Add the targeted end-to-end layer and the coverage diagnostic that complete the
testing strategy. The foundation PR (`testing-strategy.md`) delivered the static

- unit + API-integration layers and the per-feature rules; this follow-up proves
  the **critical user journeys** work against the full running stack and wires
  coverage as a diagnostic — never a gate.

### Users

Repo contributors (today: one developer + AI agents). The e2e suite must stay
tiny and fast enough to run locally on demand.

### Success criteria

- [ ] A targeted e2e layer covering the critical journeys, runnable locally
      against the full stack and ready to wire into CI later.
- [ ] `pnpm test:e2e` boots web + api against `nudo_test` and runs the journeys.
- [ ] `pnpm test:coverage` emits web + api reports with **no gating threshold**.
- [ ] No flakiness: e2e auth/setup is deterministic (register/login once, reuse).
- [ ] The two testing-strategy specs flip to `Status: Implemented` with PR links.

## Tech Stack

| Concern             | Tool                  | Status                                                        |
| ------------------- | --------------------- | ------------------------------------------------------------- |
| E2E browser         | **Playwright**        | already present in `packages/ui` (Storybook's browser engine) |
| Coverage diagnostic | `@vitest/coverage-v8` | exists (web)                                                  |

## Commands

```bash
# --- new in this PR ---
pnpm test:e2e                  # e2e against the full running stack
pnpm test:coverage             # coverage as a diagnostic (not gated)

# --- prerequisites (from the foundation PR) ---
pnpm docker:up                 # start Postgres
pnpm test:db:setup             # create + migrate the nudo_test database
```

## Project Structure

```
e2e/                           → NEW top-level package
  tests/                       → critical-journey specs
  fixtures/                    → auth/storage-state helpers
  playwright.config.ts         → runs against local web+api+test DB

docs/specs/testing-strategy-e2e.*  → this spec, its plan, its tasks
```

## E2E framework: Playwright

The e2e layer uses **Playwright**. It is already installed in `packages/ui` (the
chromium engine behind Storybook's Vitest addon), runs multiple browsers
out-of-process in parallel, ships a trace viewer and `codegen`, and reuses login
via `storageState` fixtures. It stays in one ecosystem with our Vitest tests —
no second toolchain.

## Testing Strategy (the e2e slice)

The e2e layer is the **top of the Trophy** — the smallest tier, reserved for
full-stack happy paths in a real browser. Everything testable at a lower layer
stays there; e2e only covers journeys that cut across web + api + DB.

**Critical e2e journeys (only these to start):**

1. Register → land on the welcome document.
2. Login → open a document → type → reload → content persisted (autosave).
3. Create folder + document → reorder → persists across reload.

**Coverage policy:** run `--coverage` as a _diagnostic_ to surface untrod risky
branches (auth, SQL-function mutations, RLS). **No hard threshold gates builds.**
Review uncovered branches in critical modules during PR; accept gaps in
low-risk/glue code.

## Boundaries

**Always**

- Keep the e2e suite tiny — happy paths only; push edge cases down to integration.
- Point e2e at `nudo_test` only — never the dev database.

**Ask first**

- Adding a test dependency beyond Playwright.
- Adding a new top-level `pnpm` script.
- Introducing coverage thresholds that gate builds (out of scope here).

**Never**

- Point e2e at the dev database — only `nudo_test`.
- Commit secrets in fixtures (repo will be public).
- Delete or `.skip` a failing test to go green without explicit approval.

## Success Criteria

Concretely, "done" = `pnpm test:e2e` green locally with Docker up (all three
journeys); `pnpm test:coverage` generates web + api reports with no threshold
failure; both testing-strategy specs marked `Implemented` with PR links.
