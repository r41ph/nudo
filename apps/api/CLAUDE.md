## Migrations

Migrations are **forward-only** — no `down()` functions. To revert a schema change, write a new migration that reverses it.

Files live in `src/db/migrations/` with a numeric prefix (e.g., `017_add-column.ts`).