# Plan: Testing Strategy — E2E Layer & Close-out

> Status: Implemented (PR #23 — https://github.com/r41ph/nudo/pull/23)
> Spec: [`testing-strategy-e2e.md`](./testing-strategy-e2e.md)
> Builds on: [`testing-strategy.plan.md`](./testing-strategy.plan.md) (Phases 0–2)
> Branch: `chore/testing-strategy-e2e` (PR #23)

## Approach summary

The foundation PR landed the API integration harness and the per-feature rules.
This follow-up adds the two remaining layers from the original plan — the thin
e2e tier and the coverage diagnostic — then closes out both specs. The phase
numbering continues from the foundation plan (Phases 0–2) for continuity.

```
[foundation PR: Phases 0–2 landed]
        │
        ▼
  Phase 3  E2E layer (Playwright)
        │
        ▼
  Phase 4  Coverage-as-diagnostic + close-out
```

## E2E framework: Playwright

Already installed in `packages/ui` (the chromium engine behind Storybook's
Vitest addon). Runs multiple browsers out-of-process in parallel, ships a trace
viewer and `codegen`, and reuses login via `storageState` fixtures. One
ecosystem with our Vitest tests — no second toolchain.

## Phase 3 — E2E layer

- New top-level `e2e/` workspace package with `playwright.config.ts`.
- `webServer` config boots web + api against `nudo_test` (or a
  `globalSetup` that migrates + truncates).
- `storageState` auth fixture (register/login once, reuse token).
- Implement the **3 critical journeys** from the spec.
- `pnpm test:e2e`.
- **Risk:** medium (full-stack orchestration, slowest layer). Keep the suite
  tiny. **Verify:** `pnpm test:e2e` green locally with Docker up.

## Phase 4 — Coverage diagnostic + close-out

- Wire `pnpm test:coverage` to emit reports for web + api (no gate).
- Review uncovered branches in critical modules (auth, SQL-mutation paths, RLS);
  add targeted tests for any genuine gap. Accept low-risk gaps.
- Flip both testing-strategy specs' `Status` to `Implemented`; link PRs.
- **Verify:** coverage report generates; no threshold failures (none set).

## Sequencing & parallelism

- This PR needs Phase 0 (the `createApp()` factory) from the foundation PR for
  the app to boot under test, but not Phases 1–2.
- Phase 3 before Phase 4.

## CI readiness (not built now)

No CI yet. Each command is CI-friendly: `docker:up` → `test:db:setup` →
`test:e2e`. When CI lands, these become jobs; the coverage diagnostic can be
reported (not gated) there.
