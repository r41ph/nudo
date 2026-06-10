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

- Access + refresh JWT rotation; `JWT_SECRET` and `JWT_REFRESH_SECRET` are required env vars
- Passwords hashed with bcrypt

## Error handling

Never swallow errors or return a misleading success.

- Return the correct status code: `400` invalid input, `401` unauthenticated, `403`/RLS-denied, `404` missing, `409` conflict, `500` only for genuine unexpected failures.
- Don't leak internals (stack traces, SQL, secrets) in responses; log server-side, return a safe message.
- Let PostGraphile/RLS enforce ownership — a blocked write surfaces as null/empty, not a faked-success response.
- Auth routes must cover and return the failure cases (bad credentials, reused/expired token), not just the happy path.
