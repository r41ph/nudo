---
description: Security constraints — threat model, always/ask/never boundaries, gates, accepted risks
paths:
  - 'apps/**'
  - 'packages/**/src/**'
  - '.github/**'
  - '**/package.json'
---

## Threat model

- **Assets:** users' manuscripts and account credentials.
- **Trust boundary:** everything from the browser is untrusted. The database
  is the authority on who owns what.
- **Main threats and their controls:**
  - Cross-tenant data access → RLS on every table (`app.current_user_id`).
  - Credential stuffing → rate limits on `/auth/login`, `/auth/register`,
    `/auth/refresh`.
  - XSS stealing the JWT from `localStorage` → no raw HTML sinks; rich text
    is rendered only through Plate.
  - Dependency compromise → `pnpm audit` in CI and Dependabot.
  - Leaked secrets → secretlint in pre-commit; config comes only from env.

## Always

- Authorize in RLS policies, not in app code (see `api.md`).
- Validate input at Express route boundaries; reject bad input with `400`.
- Return the status codes from `api.md` and never leak stacks, SQL or
  secrets in a response.
- Add an RLS-isolation test for every new or changed table or policy.
- Keep every security gate green on `main`: audit, lint rules, the
  `security.integration.test.ts` suite.
- Run `/security-review` (or the `agent-skills:security-auditor` agent)
  before opening a PR that touches auth, RLS, migrations, input handling
  or dependencies.

## Ask first

- Adding or upgrading a runtime dependency.
- Any change to auth, token handling, CORS, rate-limit values, helmet
  config or RLS policies.
- Changing `TRUST_PROXY_HOPS`. It must equal the number of proxies in
  front of the API; too high lets clients spoof their IP via
  `X-Forwarded-For` and dodge the rate limits.
- Adding a `SECURITY DEFINER` function. It bypasses RLS, so it must scope
  every query by `current_setting('app.current_user_id', true)` itself.
- Storing new data in `localStorage`.
- Adding an audit allow-list entry (`auditConfig.ignoreGhsas`). Each one
  needs its GHSA, the reason and a follow-up in a YAML comment.

## Never

- `dangerouslySetInnerHTML`, `eval`, `new Function`, or assigning to
  `innerHTML` / `outerHTML`. The JWT lives in `localStorage`, so any XSS is
  account takeover. Lint fails on these in `apps/**`.
- String-built SQL. Use parameters:

  ```ts
  // Bad
  pool.query(`SELECT id FROM users WHERE email = '${email}'`);
  // Good
  pool.query('SELECT id FROM users WHERE email = $1', [email]);
  ```

- Logging tokens, passwords or request bodies on auth routes.
- Disabling RLS, or querying user data with `pool` directly. `pool`
  connects as the table owner and bypasses RLS; only PostGraphile's
  `nudo_visitor` role is RLS-scoped. Direct `pool` queries belong only in
  the pre-authentication `/auth` routes, and `getTestPool()` only in tests.
- Committing secrets or real-looking fixtures.
- Relaxing a security gate to get green: lowering `--audit-level`,
  `continue-on-error`, disabling a lint rule, raising a rate limit.

## Accepted risks

Known and open on purpose. Don't "fix" these on the side; each needs its own
spec.

| Risk                                           | Why it's accepted                                                      | Follow-up                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| JWT in `localStorage`, readable by any XSS     | Moving to an `httpOnly` cookie is an auth redesign; XSS rules mitigate | Cookie-based session spec                  |
| No Content-Security-Policy on the web app      | Depends on hosting; Plate's inline styles need investigating first     | Web CSP spec                               |
| `409` on register reveals that an email exists | Clear UX for a single-author app; rate limits slow enumeration         | Revisit with email verification            |
| No GraphQL depth/cost limit                    | PostGraphile v4 OSS has no hook for it; queries are RLS-scoped         | PostGraphile v5 or a pre-parse depth check |
| In-memory rate-limit store                     | Single API instance; a restart only resets the counters                | Revisit if the API scales out              |
