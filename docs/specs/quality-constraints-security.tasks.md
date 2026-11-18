# Tasks: Security Constraints

> Plan: `docs/specs/quality-constraints-security.plan.md` · Spec: `docs/specs/quality-constraints-security.md`
> Query context7 for pnpm 11.3 (overrides, `auditConfig`) and for each library's changelog before bumping it.
> Ask first before any major upgrade or any new runtime dependency.

## PR 1 — Dependency remediation (`fix/dependency-advisories`)

### Task 1: API direct deps (`express`, `postgraphile`)

**Acceptance criteria:**
- [ ] `express` is on the latest 5.x and `postgraphile` on the latest 4.x.
- [ ] `proxy-addr` and the `express` path of `body-parser` are gone from the high/critical audit. `router>path-to-regexp` can't be refreshed alone without bumping unrelated packages, so it moves to Task 4.

**Verification:**
- [ ] `pnpm test:api`, then `pnpm docker:up && pnpm test:db:setup && pnpm test:api:int`

**Files:** `apps/api/package.json`, `pnpm-lock.yaml`
**Scope:** S

### Task 2: Web routing (`react-router-dom`)

**Acceptance criteria:**
- [ ] `react-router-dom` is on the latest 7.x in `apps/web` and `packages/ui`, and the lockfile has a single `react-router` version.
- [ ] No `react-router` advisory remains.

**Verification:**
- [ ] `pnpm test:web` filtered to routing users (`app-sidebar view-switcher project`)
- [ ] Manual check in `pnpm dev:web`: login, project, document, plot navigation

**Files:** `apps/web/package.json`, `packages/ui/package.json`, `pnpm-lock.yaml`
**Scope:** S

### Task 3: Plate (`platejs`, `@platejs/*`)

**Acceptance criteria:**
- [ ] `platejs` and every `@platejs/*` are on the same latest 52.x.
- [ ] The audit is re-run, and whatever Plate still pulls in is listed for Task 4.
- [ ] The Plate packages the editor never registers (`callout`, `code-block`, `excalidraw`, `math`, `media`, `table`, `toc`) are removed, with their dead branches in `transforms.ts`. `@platejs/excalidraw` pins `@excalidraw/excalidraw@0.18.0`, so removing it clears its advisories instead of overriding them.

**Verification:**
- [ ] Editor-related web tests (`pnpm test:web editor document`)
- [ ] Manual check: open a document, type, and reload; the edit persists with no console errors

**Files:** `apps/web/package.json`, `packages/ui/package.json`, `packages/ui/src/components/editor/transforms.ts`, `apps/web/vitest.config.ts`, `pnpm-lock.yaml`
**Scope:** S

### Task 4: Transitive overrides

**Acceptance criteria:**
- [ ] `pnpm-workspace.yaml` has an `overrides:` block for the remaining patched transitives (`router>path-to-regexp`, `ws` and `body-parser` under `postgraphile`, `nanoid` under `@platejs/core`, `browserslist`, and `glob` / `minimatch` / `@isaacs/brace-expansion` under `node-pg-migrate`). Each one is pinned to the lowest patched range, with a parent selector where only one path needs it.
- [ ] Any override that breaks its consumer is dropped and handed to Task 5.

**Verification:**
- [ ] `pnpm db:migrate` and `pnpm test:db:setup` (node-pg-migrate)
- [ ] `pnpm test:api`, `pnpm test:api:int`, and the Task 3 web checks

**Files:** `pnpm-workspace.yaml`, `pnpm-lock.yaml`
**Scope:** M

### Task 5: Allow-list and green audit

**Acceptance criteria:**
- [ ] Every remaining high/critical advisory is in `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml`, with a comment giving the GHSA, the reason and the follow-up. Each entry is agreed with the human first.
- [ ] `pnpm audit --prod --audit-level=high` exits 0.

**Verification:**
- [ ] `pnpm audit --prod --audit-level=high; echo $?` prints `0`
- [ ] `pnpm lint`

**Files:** `pnpm-workspace.yaml`
**Scope:** S

### Task 6: PR

**Acceptance criteria:**
- [ ] The branch is pushed and the PR is opened with `Spec: docs/specs/quality-constraints-security.md` (Scope → Prerequisite). The description lists the before/after audit counts and the allow-list.
- [ ] The spec's status line records the PR, committed into the same PR.

## PR 2 — Security constraints (outline, detailed after PR 1 merges)

1. Rule and docs: `.claude/rules/security.md`, the `api.md` auth correction, the `testing.md` matrix and DoD, the `CLAUDE.md` workflow step.
2. Lint: XSS and eval rules in `eslint.config.mts`, checked by hand once.
3. `assertJwtSecret` (unit test first).
4. Integration test harness: a limit override in `createApp()`, used by `seed.ts`, `graphql.ts` and the harness.
5. Hardening, test-first in `security.integration.test.ts`: helmet, rate limits, body limits, the error handler.
6. Refresh cap with `authTime` (test-first; update the existing refresh tests).
7. CI `security` job and `dependabot.yml`.
8. `/security-review`, then the PR.
