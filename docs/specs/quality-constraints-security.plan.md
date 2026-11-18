# Implementation Plan: Security Constraints

> Spec: `docs/specs/quality-constraints-security.md` (Approved)
> Map: `docs/specs/quality-constraints.md` (module `security-constraints`)
> Tasks: `docs/specs/quality-constraints-security.tasks.md`

## Overview

Two PRs, in order:

1. **Remediation** (`fix/dependency-advisories` at `../dependency-advisories`):
   make `pnpm audit --prod --audit-level=high` green. Dependency changes
   only, plus the allow-list. No gate, rule or app code.
2. **Security** (new branch from `main` after PR 1 merges): the rule, the
   gates and the API hardening from the spec's Scope.

## Baseline (re-measured 2026-11-18)

`pnpm audit --prod`: 91 findings, 1 critical, 31 high. High/critical by
entry point:

| Entry point                      | Vulnerable packages                                           | Planned fix                               |
| -------------------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| `express` ^5.1.0 (api)           | `proxy-addr` (critical), `path-to-regexp`, `body-parser`      | bump to latest 5.x                        |
| `react-router-dom` ^7.13.0       | `react-router` (6 high)                                       | bump to latest 7.x (web + ui)             |
| `postgraphile` ^4.13.0 (api)     | `ws`, `body-parser`, `lodash`                                 | latest 4.x patch, then overrides          |
| `node-pg-migrate` ^7.9.1 (api)   | `glob`, `minimatch`, `@isaacs/brace-expansion`                | overrides (v9 is a major, ask first)      |
| `platejs` / `@platejs/*` ^52     | `nanoid`, `lodash`                                            | latest 52.x, then overrides               |
| `@platejs/excalidraw`            | `dompurify`, `immutable`, `lodash-es`, `picomatch`, `source-map-js` | latest 52.x, then overrides          |
| `jotai`                          | `browserslist`                                                | override                                  |

## Architecture decisions

- **Direct bumps stay inside the current major.** `postgraphile` 5,
  `platejs` 53 and `node-pg-migrate` 9 are majors and out of scope. If a fix
  needs one, stop and ask.
- **Overrides go in `pnpm-workspace.yaml`** (`overrides:`), scoped with a
  parent selector (`parent>child`) when only one path is affected, and pinned
  to the lowest patched range so they don't pull unrelated majors.
- **The allow-list is `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml`.**
  The newer `audit.ignore` section needs pnpm ≥ 11.15, and the repo pins
  11.3.0. Each entry gets a YAML comment with the advisory, why it is
  unreachable or unfixable, and its follow-up. Moderates and lows aren't
  gated, so they don't go on the list.
- **Each fix is verified by behaviour, not just by audit.** After each group
  the affected app's tests run, because an override can break a transitive
  consumer silently.

## Risks

| Risk                                                                 | Mitigation                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| An override forces a transitive major the consumer can't run on (e.g. `minimatch` 10 under `node-pg-migrate` 7) | Run `pnpm db:migrate` and `pnpm test:db:setup`. If it breaks, allow-list with reason instead.         |
| `react-router` 7.x minor changes behaviour                           | Run web tests for routing (`app-sidebar`, `view-switcher`, `project`) and click through `pnpm dev:web`. |
| Plate/excalidraw overrides break the editor at runtime only          | Web editor tests plus a manual check: open a document, insert an excalidraw block.                      |
| `express` 5.x patch changes routing or error behaviour               | `pnpm test:api` and `pnpm test:api:int` (auth, graphql harness).                                       |

## Verification checkpoints

- After each remediation task: `pnpm audit --prod --audit-level=high`
  shows that group gone, and the affected tests pass.
- End of PR 1: the audit is green, and `pnpm lint`, the web tests and the API
  unit + integration tests pass. Typecheck runs in pre-push.
- PR 2 is planned in detail when PR 1 merges; its task outline is in the
  tasks file.
