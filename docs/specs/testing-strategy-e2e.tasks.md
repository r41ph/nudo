# Tasks: Testing Strategy — E2E Layer & Close-out

> Status: Implemented (PR #23 — https://github.com/r41ph/nudo/pull/23)
> Spec: [`testing-strategy-e2e.md`](./testing-strategy-e2e.md)
> Plan: [`testing-strategy-e2e.plan.md`](./testing-strategy-e2e.plan.md)
> Builds on: [`testing-strategy.tasks.md`](./testing-strategy.tasks.md) (Phases 0–2)
> Branch: `chore/testing-strategy-e2e` (PR #23)

Tasks continue the phase numbering from the foundation spec. Each is
independently verifiable. No task touches more than ~5 files.

---

## Phase 3 — E2E layer (Playwright)

### Task 3.1 — Scaffold e2e package

- **Acceptance:** top-level `e2e/` workspace; `playwright.config.ts` boots
  web + api against the test DB; auth `storageState` fixture; `pnpm test:e2e`.
- **Verify:** `pnpm test:e2e` runs an empty/smoke spec green with Docker up.
- **Files:** `e2e/package.json`, `e2e/playwright.config.ts`,
  `e2e/fixtures/auth.ts`, `pnpm-workspace.yaml`, root `package.json`.

### Task 3.2 — Critical-journey specs

- **Acceptance:** the 3 journeys from the spec pass (register→welcome;
  login→edit→reload persists; folder+doc→reorder→persists).
- **Verify:** `pnpm test:e2e` green.
- **Files:** `e2e/tests/*.spec.ts` (≤3 files).

## Phase 4 — Coverage diagnostic + close-out

### Task 4.1 — Coverage as diagnostic

- **Acceptance:** `pnpm test:coverage` reports web + api; **no gating
  thresholds**. Review critical-module gaps; add targeted tests for genuine ones.
- **Verify:** report generates; no threshold failure (none configured).
- **Files:** `apps/api/vitest*.config.ts`, root `package.json`.

### Task 4.2 — Close out specs

- **Acceptance:** the `testing-strategy.*` and `testing-strategy-e2e.*` docs flip
  to `Status: Implemented` with PR links.
- **Verify:** read-through.
- **Files:** `docs/specs/testing-strategy*.md`.
