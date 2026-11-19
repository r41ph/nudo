---
description: Express API conventions — PostGraphile, PostgreSQL, auth
paths:
  - 'apps/api/src/**'
---

## PostGraphile

The GraphQL API is auto-generated from the PostgreSQL schema — do not write resolvers manually.

- Standard CRUD: auto-exposed for every table
- Custom business logic or multi-step atomic operations: implement as a PostgreSQL function; PostGraphile exposes it as a GraphQL mutation automatically
- Auth endpoints (`/auth/login`, `/auth/register`, `/auth/refresh`) are plain Express routes outside PostGraphile

## Row-level security

RLS is enabled on all tables via `app.current_user_id`. The database enforces ownership — never add application-layer ownership filtering on top.

## Migrations

- Forward-only — no `down()` functions. To revert a schema change, write a new migration that reverses it.
- File naming: `0XX_description.ts` (next number in sequence)
- Location: `apps/api/src/db/migrations/`
- Run: `pnpm db:migrate` (requires docker to be up, e.g.run `pnpm docker:up` if docker is not running)

## Auth

- One JWT, signed with `JWT_SECRET` (the only auth env var; required, and at least 32 characters in production). Expiry comes from `JWT_EXPIRES_IN` (default `7d`). There is no separate refresh token.
- `/auth/refresh` re-signs the token but keeps the original login's expiry, so it never extends a session.
- The web app stores the token in `localStorage` (`apps/web/src/shared/lib/auth.ts`).
- Passwords hashed with bcrypt (cost 10).
- Threat model, boundaries and accepted risks: see `security.md`.

## Error handling

Never swallow errors or return a misleading success.

- Return the correct status code: `400` invalid input, `401` unauthenticated, `403`/RLS-denied, `404` missing, `409` conflict, `500` only for genuine unexpected failures.
- Don't leak internals (stack traces, SQL, secrets) in responses; log server-side, return a safe message.
- Let PostGraphile/RLS enforce ownership — a blocked write surfaces as null/empty, not a faked-success response.
- Auth routes must cover and return the failure cases (bad credentials, reused/expired token), not just the happy path.
