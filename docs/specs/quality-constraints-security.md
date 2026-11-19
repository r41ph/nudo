# Spec: Security Constraints

> Status: Approved (2026-11-18). Prerequisite in review (PR #57 — https://github.com/r41ph/nudo/pull/57)
> Module: `security-constraints` (see `docs/specs/quality-constraints.md`)

## Objective

Agents working in nudo should write secure code by default. They should also
be stopped by automation when they don't. Today the security rules are split
across `api.md` and `testing.md`, and part of them is out of date. Nothing
fails CI on a vulnerable dependency, a missing security header or an
unthrottled login route.

This module delivers three things:

1. **A rule** (`.claude/rules/security.md`) that agents load whenever they
   touch app code, CI or dependencies. It states the threat model, the
   always/ask/never boundaries and the review step.
2. **Gates** that fail lint or CI when the bar is lowered.
3. **The hardening those gates need in order to pass.** A gate that fails on
   `main` the day it lands would just get disabled.

Success means an agent that reads only the rule and the DoD would produce a
change a security reviewer accepts, and CI rejects a change that regresses
any gated property.

## Current state (baseline, 2026-10-22)

| Area                | Today                                                                                   | Gap                                                    |
| ------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Authorization       | RLS on every table via `app.current_user_id`; RLS-isolation tests required by DoD        | None, so keep it as the core rule                      |
| Auth tokens         | One JWT, `JWT_EXPIRES_IN` default `7d`, stored in `localStorage` (`shared/lib/auth.ts`)  | `api.md` wrongly describes access+refresh rotation     |
| Token refresh       | `/auth/refresh` signs a fresh `JWT_EXPIRES_IN` token from any unexpired one; no web caller today | A stolen token can be extended forever          |
| Passwords           | bcrypt, cost 10                                                                         | Acceptable (OWASP minimum); no rule fixes the floor    |
| Secrets             | `requireEnv`, secretlint in pre-commit                                                  | No minimum strength for `JWT_SECRET` in production     |
| HTTP headers        | None (no helmet)                                                                        | No `nosniff`, frame, referrer or HSTS headers          |
| Brute force         | `/auth/login` and `/auth/register` unthrottled                                          | No rate limiting                                       |
| Input size          | `express.json()` default (100 kb); PostGraphile default body limit                     | Not stated or tested                                   |
| GraphQL abuse       | GraphiQL and stack traces off in production                                             | No depth or cost limit (accepted risk, see below)      |
| XSS sinks           | No `dangerouslySetInnerHTML` / `innerHTML` in `apps/web/src` today                      | Nothing prevents them being added                      |
| Dependencies        | Nothing; `pnpm audit --prod`: 1 critical, 30 high                                       | No audit in CI, no Dependabot                          |
| Error leakage       | `api.md` rule; routes return safe messages                                              | No test that malformed input doesn't leak a stack      |

## Scope

**In scope**

- `.claude/rules/security.md` (new), plus corrections to the auth section of
  `.claude/rules/api.md`.
- Security rows in the required-tests matrix and the DoD in `testing.md`.
- CI: a `security` job that runs `pnpm audit --prod --audit-level=high`.
- `.github/dependabot.yml` for npm security updates and GitHub Actions.
- ESLint rules with no new dependency, as errors in `apps/**`: `no-eval`,
  `no-implied-eval`, `no-new-func`, `react/no-danger`, and
  `no-restricted-syntax` with an `AssignmentExpression` selector banning
  assignment to `innerHTML` / `outerHTML` (`no-restricted-properties` would
  also flag reads). `packages/ui` is left out: its `components/ui/` is
  shadcn-managed and must not be edited.
- API hardening, each piece locked by integration tests:
  - security headers via `helmet`. API responses are JSON, so CSP is
    `default-src 'none'`, applied in production only: GraphiQL is served
    from the same app outside production and that CSP would block it.
  - rate limiting on `/auth/login`, `/auth/register` and `/auth/refresh` via
    `express-rate-limit` with its in-memory store (the API runs as a single
    instance with no reverse proxy, so `trust proxy` stays off). Per IP, in
    a 15-minute window: 10 requests on login/register, 60 on refresh. The
    values live in `constants/auth.constants.ts`. The limiters are created inside
    `createApp()`, not on the module-level `authRouter`, and `createApp()`
    accepts a limit override (see Testing strategy).
  - an explicit `express.json({ limit })` and PostGraphile `bodySizeLimit`,
    returning `413`
  - an Express error handler in `app.ts`: malformed JSON returns `400` and
    oversized bodies `413`, each with a safe message and no stack (the
    default handler prints the stack whenever `NODE_ENV` isn't `production`)
  - in production, startup fails if `JWT_SECRET` is shorter than 32
    characters
  - `/auth/refresh` no longer extends a session: login adds an `authTime`
    claim, refresh copies it and sets the new token's `exp` to
    `authTime + JWT_EXPIRES_IN`, so a refreshed token never outlives the
    original login. A token without `authTime` (issued before this change)
    gets `401` and the user logs in again.
- The CLAUDE.md feature workflow gains a step: run `/security-review` (or
  the `agent-skills:security-auditor` agent) before opening a PR that touches
  auth, RLS, migrations, input handling or dependencies.

**Prerequisite (separate PR, lands first)**

- Dependency remediation: upgrade the direct deps with advisories
  (`express`, `react-router-dom`, `postgraphile` patch, `platejs` minor), add
  `overrides` in `pnpm-workspace.yaml` for patched transitives (pnpm 11
  ignores the `pnpm` field of `package.json`), and allow-list what is left
  with its advisory ID, reason and follow-up. This PR only makes
  `pnpm audit --prod --audit-level=high` green. The CI `security` job and
  Dependabot land in the security PR, once that is true on `main`.

**Out of scope (recorded as follow-up specs)**

- Moving the JWT from `localStorage` to an `httpOnly` cookie, or adding real
  refresh-token rotation. This is a large auth redesign. The rule records it
  as a known accepted risk, and XSS prevention is the mitigation.
- A Content-Security-Policy for the web app. It depends on how the web app is
  hosted, and Plate's inline styles need to be investigated first.
- Account lockout, MFA and email verification.
- Paid tooling (GitHub Advanced Security, Snyk).

## Rule content (`.claude/rules/security.md`)

Frontmatter loads it for `apps/**`, `packages/**/src/**`, `.github/**` and
`**/package.json`. Sections:

1. **Threat model (short).** Assets: manuscripts and account credentials.
   Trust boundary: everything from the browser is untrusted, and the database
   is the authority on ownership. Main threats: cross-tenant data access
   (handled by RLS), credential stuffing (rate limiting), XSS stealing the
   `localStorage` token (no raw HTML sinks; Plate content rendered only
   through Plate), dependency compromise (audit and Dependabot), and leaked
   secrets (secretlint, env-only config).
2. **Always:** authorize in RLS policies, not app code. Validate input at
   Express route boundaries. Return the status codes from `api.md`. Add an
   RLS-isolation test for every table or policy change. Run
   `/security-review` before a PR in the sensitive areas listed above.
3. **Ask first:** adding or upgrading a runtime dependency; any change to
   auth, token handling, CORS, rate-limit values, helmet config or RLS
   policies; adding `SECURITY DEFINER` SQL functions; storing new data in
   `localStorage`.
4. **Never:** `dangerouslySetInnerHTML`, `eval` or `new Function`;
   string-built SQL (use parameters); logging tokens, passwords or request
   bodies on auth routes; disabling RLS or using the owner pool outside tests;
   committing secrets or real-looking fixtures; relaxing a security gate
   (audit level, lint rule, rate limit) to get green.
5. **Accepted risks.** A list of known open risks (token in `localStorage`,
   no web CSP, the 409 on register reveals that an email exists), each with
   its reason and its follow-up. Agents must not "fix" these on the side.

## Commands

```bash
pnpm audit --prod --audit-level=high   # dependency gate (same as CI)
pnpm lint                              # includes the new XSS / eval rules
pnpm test:api                          # unit (env secret validation)
pnpm docker:up && pnpm test:db:setup && pnpm test:api:int security   # hardening integration tests
```

## Project structure

```
.claude/rules/security.md                     → new rule
.claude/rules/api.md                          → auth section corrected; links to security.md
.claude/rules/testing.md                      → security rows in matrix + DoD
apps/api/src/app.ts                           → helmet, body limits, rate-limit wiring, error handler
apps/api/src/constants/auth.constants.ts      → rate-limit window/max, body limit, secret-strength check
apps/api/src/auth/routes.ts, auth/utils.ts    → `authTime` claim, capped refresh
apps/api/src/security.integration.test.ts     → headers, 429, 413, malformed JSON, refresh cap
eslint.config.mts                             → XSS/eval rules
.github/workflows/ci.yml                      → `security` job
.github/dependabot.yml                        → new
CLAUDE.md                                     → workflow step + commands
```

## Code style

Matches the existing rule files: short sections, imperative bullets, and
bad/good examples only where the rule is easy to misread.

```md
---
description: Security constraints — threat model, boundaries, gates
paths:
  - 'apps/**'
  - 'packages/**/src/**'
  - '.github/**'
  - '**/package.json'
---

## Never

- `dangerouslySetInnerHTML` — render rich text through Plate only. The JWT
  lives in `localStorage`, so any XSS is account takeover.
```

Config values go in `constants/` (e.g. `AUTH_RATE_LIMIT`), per CLAUDE.md.

## Testing strategy

- **API integration** (`security.integration.test.ts`, supertest against
  `createApp()`): helmet headers present on `/auth/*` and `/graphql`. The
  N+1th login attempt in the window returns `429`. A body over the limit
  returns `413` on both `/auth` and `/graphql`. Malformed JSON returns `400`
  and the body contains no `at ` stack frames. A refreshed token's `exp`
  equals the original login's, and a token without `authTime` gets `401`.
  This file builds its own app with a low limit override, so the 429 test
  is fast and isolated.
- **Existing integration tests:** `test/seed.ts` registers every seeded user
  through one `createApp()` per test file (up to 41 `createUser` calls in
  `plot.integration.test.ts`), so the default 10-per-window limit would
  return `429`. The harness apps (`seed.ts`, `graphql.ts`, `harness`) pass a
  limit override high enough never to trip. Production code paths don't
  use the override.
- **API unit** (`auth.constants.test.ts`): the check is a pure function,
  `assertJwtSecret(value, nodeEnv)`, so it can be tested without
  re-importing the module. A short secret throws when `nodeEnv` is
  `production` and is allowed otherwise. This keeps the CI placeholder
  (`ci-placeholder-secret`, CI doesn't set `NODE_ENV=production`) working.
- **Lint rules**: verified once by hand during implementation (a temporary
  file with `dangerouslySetInnerHTML` fails `pnpm lint`). No committed
  fixture.
- **CI audit job**: verified by the job going green on the PR, after the
  prerequisite remediation PR has landed.
- Existing auth integration tests must still pass. The only expected change
  is to tests that assert on `/auth/refresh` behavior.

## Boundaries

- **Always:** keep every new gate green on `main` from day one. Put limits
  in `constants/`. Write the integration test before the hardening code it
  locks (TDD).
- **Ask first:** changing the rate-limit numbers. Adding `helmet`
  and `express-rate-limit` (the only new runtime deps). Any change to CORS.
  Raising the bcrypt cost (it would invalidate nothing, but it slows the
  test suite).
- **Never:** turn on a gate with `continue-on-error`. Lower `--audit-level`
  to get green. Add `pnpm audit` exceptions without a recorded advisory ID
  and reason.

## Success criteria

- [ ] `.claude/rules/security.md` exists with the five sections above and
      loads for the configured paths.
- [ ] `api.md` auth section matches the code (single JWT, expiry from
      `JWT_EXPIRES_IN`, `localStorage` on web) and links to `security.md`.
- [ ] `testing.md` matrix has rows for "new/changed input-handling route"
      and "new/changed dependency", and the DoD has a security checklist item.
- [ ] CI has a `security` job running `pnpm audit --prod --audit-level=high`,
      and it passes on the PR.
- [ ] `dependabot.yml` covers npm (root workspace) and GitHub Actions.
- [ ] `pnpm lint` fails on `dangerouslySetInnerHTML`, `eval`, `new Function`
      and `el.innerHTML =` in `apps/**`.
- [ ] API responses carry helmet headers. Login/register/refresh return
      `429` past the limit. Oversized bodies return `413`. Malformed JSON
      returns a stackless `400`. All of this is covered by integration tests.
- [ ] The API refuses to start in production with a `JWT_SECRET` under 32
      characters.
- [ ] `/auth/refresh` never issues a token that expires after the original
      login's token.
- [ ] The CLAUDE.md workflow includes the security-review step for sensitive
      changes.

## Resolved in review

- **GraphQL depth/cost limiting:** accepted risk for this module. PostGraphile
  v4's open-source build doesn't expose custom validation rules (the depth
  limit is a Graphile Pro plugin), queries are RLS-scoped, and the API is
  single-tenant per user. Revisit with a PostGraphile v5 migration or a
  pre-parse depth check on `/graphql`.
- **Rate-limit numbers:** per IP, in a 15-minute window: 10 requests on
  login/register, 60 on refresh.

- **Rate-limit store:** in-memory. The API runs as a single instance with no
  reverse proxy. Revisit the store and `trust proxy` if that changes.
- **Token refresh:** fixed in this module with the `authTime` cap, not
  recorded as an accepted risk.
- **Existing advisories:** `pnpm audit --prod` on `main` reported
  **1 critical, 30 high** (89 in total) on 2026-10-22. The critical one is
  `proxy-addr` through `express`. Direct deps with advisories:
  `react-router(-dom)` (6 high) and `postgraphile` (11 paths). Most of the
  rest come through `platejs` / `@platejs/*`, including
  `excalidraw > mermaid > dompurify`. Remediation is its own PR that lands
  before this one (see Scope → Prerequisite). Re-measure when it starts.
