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
- Outcome: Tasks 1–4 cleared every high and critical advisory, so the allow-list is empty and `auditConfig` isn't added.

**Verification:**
- [ ] `pnpm audit --prod --audit-level=high; echo $?` prints `0`
- [ ] `pnpm lint`

**Files:** `pnpm-workspace.yaml`
**Scope:** S

### Task 6: PR

**Acceptance criteria:**
- [ ] The branch is pushed and the PR is opened with `Spec: docs/specs/quality-constraints-security.md` (Scope → Prerequisite). The description lists the before/after audit counts and the allow-list.
- [ ] The spec's status line records the PR, committed into the same PR.

## PR 2 — Security constraints (`feat/security-constraints`)

Order: the agent harness first (Tasks 7–8), then the API hardening test-first
(Tasks 9–12), then the CI gates (Task 13). Tasks 9–12 are groundwork the
gates need in order to pass on `main`.

### Task 7: Security rule and docs

**Acceptance criteria:**
- [ ] `.claude/rules/security.md` exists with the spec's five sections (threat model, always, ask first, never, accepted risks). Its frontmatter loads it for `apps/**`, `packages/**/src/**`, `.github/**` and `**/package.json`, in the format the current Claude Code docs give for rule files (checked before writing).
- [ ] The `api.md` Auth section matches the code: one JWT, expiry from `JWT_EXPIRES_IN` (default `7d`), refresh capped at the original login (Task 12), stored in `localStorage` on web, `JWT_SECRET` only. It links to `security.md`.
- [ ] The `testing.md` matrix gains rows for "New/changed input-handling route" (integration incl. 400/413 and no stack in the body) and "New/changed dependency" (`pnpm audit --prod --audit-level=high` green, no new allow-list entry without an advisory ID and reason). The DoD gains a security item pointing at `security.md`.
- [ ] The `CLAUDE.md` feature workflow gains the step: run `/security-review` (or the `agent-skills:security-auditor` agent) before opening a PR that touches auth, RLS, migrations, input handling or dependencies. The Commands block gains `pnpm audit --prod --audit-level=high`.

**Verification:**
- [ ] Read `.claude/rules/security.md` in a fresh session on a file under `apps/api/src`; the rule loads.
- [ ] Every statement in the `api.md` Auth section checked against `auth/utils.ts`, `auth/routes.ts` and `auth.constants.ts`.

**Files:** `.claude/rules/security.md` (new), `.claude/rules/api.md`, `.claude/rules/testing.md`, `CLAUDE.md`
**Scope:** S

### Task 8: XSS and eval lint rules

**Acceptance criteria:**
- [ ] `eslint.config.mts` has a block for `apps/**` setting, as errors: `no-eval`, `no-implied-eval`, `no-new-func`, `react/no-danger`, and `no-restricted-syntax` with an `AssignmentExpression` selector on `innerHTML` / `outerHTML` and a message pointing at `security.md`.
- [ ] Reading `el.innerHTML` stays allowed. `packages/ui` is not covered.
- [ ] `pnpm lint` passes on the current code.

**Verification:**
- [ ] By hand, once: a temporary `apps/web/src/lint-check.tsx` with `dangerouslySetInnerHTML`, `eval('1')`, `new Function('')` and `el.innerHTML = ''` fails `pnpm lint` with one error each; a read of `el.innerHTML` doesn't. The file is deleted, not committed.
- [ ] Rule names checked in context7 for the installed ESLint and `eslint-plugin-react` versions.

**Files:** `eslint.config.mts`
**Scope:** XS

### Task 9: `assertJwtSecret`

**Acceptance criteria:**
- [ ] `assertJwtSecret(value, nodeEnv)` in `auth.constants.ts` throws when `nodeEnv === 'production'` and `value` is shorter than 32 characters, and returns otherwise. The minimum length is a named constant.
- [ ] `JWT_SECRET` is passed through it at module load, so the API refuses to start in production with a short secret.
- [ ] The CI placeholder (`ci-placeholder-secret`, no `NODE_ENV=production`) keeps working.

**Verification:**
- [ ] Test first: `auth.constants.test.ts` fails before the function exists, then `pnpm test:api auth.constants` passes. Cases: short + production throws; 32 chars + production passes; short + development / test / undefined passes.
- [ ] `NODE_ENV=production JWT_SECRET=short pnpm --filter api start` (or the equivalent `node` entry) exits with the error.

**Files:** `apps/api/src/constants/auth.constants.ts`, `apps/api/src/constants/auth.constants.test.ts` (new)
**Scope:** XS

### Task 10: Rate-limit override in `createApp()`

Groundwork for Task 11: the default limit would return `429` to the existing integration tests (`plot.integration.test.ts` registers up to 41 users through one app; `auth.integration.test.ts` makes 19 auth calls).

**Acceptance criteria:**
- [ ] `createApp(options?)` takes an optional `{ authRateLimit?: { login?: number; refresh?: number } }`. With no argument it uses the values from `auth.constants.ts`. `index.ts` keeps calling it with no argument.
- [ ] A test-only constant (e.g. `TEST_AUTH_RATE_LIMIT` in `test/`) high enough never to trip is passed by every test app: `test/seed.ts`, `test/graphql.ts`, `test/harness.integration.test.ts`, `auth/auth.integration.test.ts`, `auth/middleware.integration.test.ts`.
- [ ] No behaviour change yet: the option is accepted but no limiter exists until Task 11.

**Verification:**
- [ ] `pnpm test:api:int` passes unchanged.

**Files:** `apps/api/src/app.ts`, the five test files above, a test constants file under `apps/api/src/test/`
**Scope:** S

### Task 11: Headers, rate limits, body limits, error handler

New runtime deps `helmet` and `express-rate-limit` (named in the approved spec). Pick versions older than 24 h so `minimumReleaseAge` doesn't add an exclusion, and check each API in context7.

**Acceptance criteria:**
- [ ] Tests first, in `apps/api/src/security.integration.test.ts`, against an app built with a low limit override (e.g. 2):
  - helmet headers (`x-content-type-options: nosniff`, `x-frame-options`, `referrer-policy`) on `/auth/login` and `/graphql`; CSP `default-src 'none'` only when the app runs in production mode, absent otherwise so GraphiQL works.
  - the N+1th request returns `429` on `/auth/login`, `/auth/register` and `/auth/refresh`, each with a JSON `{ error }` body.
  - a body over the limit returns `413` on `/auth/login` and `/graphql`.
  - malformed JSON on `/auth/login` returns `400` with a safe message and no `at ` stack frames in the body.
- [ ] `app.ts`: `helmet()` first, CSP `default-src 'none'` in production only. Limiters are created inside `createApp()` (not on the module-level `authRouter`), per IP, 15-minute window, 10 on login/register, 60 on refresh, in-memory store, `trust proxy` off. `express.json({ limit })` on `/auth`. An error handler after all routes maps body-parser `entity.parse.failed` → `400` and `entity.too.large` → `413`, logs anything else and returns a generic `500`, never a stack.
- [ ] `config/postgraphile.ts` sets `bodySizeLimit` to the same limit, and its `413` goes through (or matches) the error handler. Behaviour checked in context7 for PostGraphile 4.x.
- [ ] Window, maxima and body limit live in `constants/auth.constants.ts` (e.g. `AUTH_RATE_LIMIT`, `BODY_SIZE_LIMIT`).

**Verification:**
- [ ] `pnpm test:api:int security` fails before the code and passes after.
- [ ] Full `pnpm test:api:int` still passes (the Task 10 override holds).
- [ ] Manual: `pnpm --parallel --filter './apps/*' dev`, log in from the web app, open a document; no CORS or header breakage in the console.

**Files:** `apps/api/package.json`, `pnpm-lock.yaml`, `apps/api/src/app.ts`, `apps/api/src/config/postgraphile.ts`, `apps/api/src/constants/auth.constants.ts`, `apps/api/src/security.integration.test.ts` (new)
**Scope:** M

### Task 12: Refresh cap with `authTime`

**Acceptance criteria:**
- [ ] Tests first, in `security.integration.test.ts`: a token from `/auth/refresh` has the same `exp` as the login token it came from (also after refreshing twice), and a token without `authTime` gets `401`.
- [ ] `signToken` adds `authTime` (seconds) on login and register. Refresh copies `authTime` and sets `exp` to `authTime + JWT_EXPIRES_IN`, so the result never outlives the original login. `verifyToken` returns `authTime`.
- [ ] The existing refresh tests in `auth.integration.test.ts` are updated only where they assert refresh behaviour (the expired-token case signs with `authTime`; the happy path also checks `exp`).
- [ ] The web app is unaffected (it doesn't call `/auth/refresh`); `authMiddleware` keeps accepting tokens without `authTime`, so current sessions on `/graphql` survive until they expire.

**Verification:**
- [ ] `pnpm test:api:int security auth` fails before and passes after.
- [ ] `pnpm test:api utils` (unit tests on `signToken` / `verifyToken`) passes, updated if they assert the payload shape.

**Files:** `apps/api/src/auth/utils.ts`, `apps/api/src/auth/routes.ts`, `apps/api/src/auth/utils.test.ts`, `apps/api/src/auth/auth.integration.test.ts`, `apps/api/src/security.integration.test.ts`
**Scope:** S

### Task 13: CI `security` job and Dependabot

**Acceptance criteria:**
- [ ] `.github/workflows/ci.yml` has a `security` job (same checkout / pnpm / Node setup as `quality`) running `pnpm audit --prod --audit-level=high`, with no `continue-on-error`.
- [ ] `.github/dependabot.yml` covers `npm` at `/` (the pnpm workspace) and `github-actions` at `/`, weekly, with a small open-PR limit. Format checked against the current GitHub docs, including pnpm workspace support.

**Verification:**
- [ ] `pnpm audit --prod --audit-level=high; echo $?` prints `0` locally.
- [ ] The `security` job is green on the PR.

**Files:** `.github/workflows/ci.yml`, `.github/dependabot.yml` (new)
**Scope:** XS

### Task 14: Security review and PR

**Acceptance criteria:**
- [ ] `/security-review` runs on the branch; every finding is fixed or recorded in the PR with its reason.
- [ ] The branch is pushed and the PR opened with `Spec: docs/specs/quality-constraints-security.md`, listing the success criteria and how each is verified.
- [ ] The spec's status line records the PR, committed into the same PR.
