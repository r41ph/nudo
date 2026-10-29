<img src="apps/web/src/assets/nudo-A-Editorial-Bold-transparent.svg" alt="nudo logo" height="32" />

[![CI](https://github.com/r41ph/nudo/actions/workflows/ci.yml/badge.svg)](https://github.com/r41ph/nudo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A full-stack writing application built for long-form writing. Writers organise a manuscript into an outline of chapters and folders, write in a rich text editor with a customisable toolbar, track each document's status, summary and POV, and have their work saved automatically as they type.

## Features

- **Rich text editor** — powered by Plate.js. Supports headings, bold, italic, underline, strikethrough, blockquotes, code blocks, font size and colour, highlight, and text alignment
- **Customisable toolbar** — users choose which tools appear in their toolbar; preferences are persisted per user
- **Comments and suggestions** — inline annotations and tracked suggestions for reviewing and collaborating on documents
- **Projects** — each manuscript is a project that owns its outline; routes, the outline and word counts are scoped to the active project. New accounts start with one project (switching between several is planned)
- **Outline** — create, rename, and delete documents and folders, nest them, and reorder them with drag and drop
- **Document inspector** — a side panel for editing a document's title, status, summary, and POV, with POV suggestions drawn from the rest of the manuscript
- **Focus mode and dark mode** — hide the surrounding chrome while writing; switch between light and dark themes from the sidebar
- **Responsive layout** — the sidebar and inspector slide in as overlays on narrower screens
- **Auto-save** — content is saved automatically with a 2.5 s debounce; a status indicator shows save state
- **Document versioning** — previous versions are stored automatically on save (restore exists as a database function but is not yet surfaced in the UI)
- **Authentication** — JWT-based login and registration with access/refresh token rotation
- **Word count** — live word counts for the current document and the whole manuscript

**In progress:** a Plot tool for arranging plotlines and beats alongside the manuscript.

---

## Architecture

The project is a **pnpm monorepo** with three packages:

| Package       | Role                                       |
| ------------- | ------------------------------------------ |
| `apps/web`    | React 19 SPA — feature-based structure     |
| `apps/api`    | Express v5 API — PostGraphile + PostgreSQL |
| `packages/ui` | Shared shadcn/ui component library         |

### Backend

**PostGraphile**: API is auto-generated directly from the PostgreSQL schema. Standard CRUD operations are available for free; custom business logic is implemented as PostgreSQL functions, which PostGraphile exposes automatically as GraphQL mutations.

Row-level security (RLS) is enabled on all tables using `app.current_user_id`. The database enforces data ownership at the query level — no application-layer filtering needed.

Authentication lives outside PostGraphile at `/auth/login`, `/auth/register`, and `/auth/refresh` as standard Express routes.

### Frontend

The frontend is organised by **feature** rather than by type:

```
src/features/
  auth/
  document/
  outline/
  toolbar/
  sidebar/
  ...
```

Each feature is self-contained with its own `components/`, `hooks/`, `state/`, `api/`, `<feature>.constants.ts` and `<feature>.types.ts`. Nothing reaches into another feature's internals — shared code lives in `src/shared/`.

**State management follows a clear split:**

- **TanStack Query** — all server state (documents, folders, anything fetched from the API). Handles caching, invalidation, and loading/error states.
- **Jotai** — client-only state (current document, auth session, dialog state, toolbar preferences, etc). Atoms are defined in `state/` within each feature.

Do not use Jotai for data that comes from the server, and do not use TanStack Query for purely local UI state.

### Shared UI

`packages/ui` is a standalone component library based on shadcn/ui, browsable in isolation via Storybook. It has no knowledge of the app's business logic or API.

---

## Tech Stack

**Frontend**

- React 19 + Vite + TypeScript
- Plate.js v52 (Slate) — rich text editor
- TanStack Query + graphql-request — server state and data fetching
- Jotai — client state
- React Router v7
- Tailwind CSS v4 + shadcn/ui

**Backend**

- Express v5 + TypeScript
- PostGraphile v4 — GraphQL API auto-generated from PostgreSQL schema
- node-pg-migrate — database migrations
- JWT (access + refresh tokens), bcrypt

**Tooling**

- Vitest + Testing Library + MSW — testing
- ESLint + Prettier — linting and formatting
- Storybook — UI component explorer
- Docker Compose — local PostgreSQL

---

## Getting Started

**Prerequisites:** Node.js 20+, pnpm 11+, Docker

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill in environment variables (see Environment Variables below)
cp .env.example .env                    # API — read from the repo root
cp apps/web/.env.example apps/web/.env  # web

# 3. Start PostgreSQL
pnpm docker:up

# 4. Run database migrations
pnpm db:migrate

# 5. Start dev servers
pnpm dev
```

| Service     | URL                            |
| ----------- | ------------------------------ |
| Web app     | http://localhost:5173          |
| GraphQL API | http://localhost:3001/graphql  |
| GraphiQL    | http://localhost:3001/graphiql |
| Storybook   | http://localhost:6006          |

No seed account is included — create one at `/login`.

---

## Development Guide

### Path aliases

Always use path aliases when importing across packages. Never use relative paths.

| Alias    | Resolves to         |
| -------- | ------------------- |
| `@web/*` | `apps/web/src/*`    |
| `@api/*` | `apps/api/src/*`    |
| `@ui/*`  | `packages/ui/src/*` |

### Adding a new feature

Create a directory under `apps/web/src/features/<feature-name>/` and add only the subdirectories you need:

```
features/my-feature/
  api/          # GraphQL query/mutation strings
  components/   # React components (and co-located tests)
  hooks/        # Custom hooks
  state/        # Jotai atoms
  <feature>.types.ts      # TypeScript types for this feature
```

Keep all code for a feature inside its own directory. If two features need to share something, move it to `src/shared/`.

### UI components

`packages/ui/src/components/ui/` contains shadcn/ui components. **Do not edit these files** — they are managed by shadcn and will be overwritten on updates.

- Always prefer a component from `@ui/components/ui/` over a raw HTML element
- Never use `<button>`, `<input>`, or `<label>` directly when a component exists
- To add a missing component: `npx shadcn@latest add <component>` (run from the repo root; it targets `packages/ui/components.json`)

### AI Development

The project includes configuration for Claude Code in the `.claude/` directory, including repository rules and reusable skills. It also uses the [agent-skills](https://github.com/addyosmani/agent-skills)
plugin to enable structured multi-agent workflows and help Claude Code follow consistent conventions and development practices across the repository.

### Grounding a feature: specs and design handoffs

Every non-trivial feature is grounded in a **source of truth** before any code is
written. There are two supported paths — pick whichever the work started from:

- **Spec-driven** (`docs/specs/<feature>.md`) — you write a structured spec first,
  via the `/spec` workflow, then implement against it.
- **Design handoff** (`docs/design-handoffs/<feature>/`) — the work begins
  **outside this repo**: a dev produces a prototype plus a scope doc in
  [Claude design](https://claude.ai), then hands the bundle to Claude Code to
  implement here. This is the path to follow whenever you bring in a Claude design
  prototype.

**If you create or receive a Claude design prototype, do this so the docs stay
consistent:**

1. **Commit the bundle** under `docs/design-handoffs/<feature>/` (kebab-case
   feature name) as its own `docs:` commit. The bundle is a `README.md` (the
   scope doc) plus the prototype files (HTML / JSX).
2. **Treat the bundle's `README.md` as the contract.** Its "what changes vs.
   current code" scope table is authoritative. The prototype files are a
   **visual reference, not code to copy** — restyle and extend the existing
   codebase using its own patterns and components, changing as little as
   possible.
3. **Implement in Claude Code** against that scope, following the normal branch +
   PR flow below.
4. **Link them.** Reference the bundle from the PR
   (`Design handoff: docs/design-handoffs/<feature>/README.md`) and record the PR
   URL back in the bundle's README. A committed handoff is **frozen** — don't keep
   editing it as the implementation evolves; capture later changes in the PR or a
   spec.

The fuller version of this workflow lives in `CLAUDE.md` (Feature Workflow →
Design-handoff workflow), which Claude Code reads automatically.

### Naming conventions

- **Files:** kebab-case (`document-page.tsx`, `use-auto-save.ts`)
- **Components:** PascalCase (`DocumentPage`, `SaveBar`)
- **Types:** `<feature>.types.ts` at the feature root (e.g., `auth.types.ts`)
- **Constants:** `<feature>.constants.ts` at the feature root (e.g., `toolbar.constants.ts`); export as `const` objects
- **Commits:** Conventional Commits — `feat:`, `fix:`, `refactor:`, `chore:`, etc.

### Comments

Comments explain **why**, not **what**. A comment earns its place only when the
code alone can't tell you something — a constraint, a trade-off, a workaround,
a non-obvious dependency, a regression a test locks.

- Don't restate the code, narrate layout, or add section banners.
- Don't describe what a story or test shows; its name does that.
- No commented-out code — delete it, git keeps it.
- Keep the ones you write short. One or two lines that give the reason beat
  a doc block that summarises the function.

---

## Database & Migrations

Migrations live in `apps/api/src/db/migrations/` with a numeric prefix (e.g., `017_add-column.ts`).

**Migrations are forward-only.** There are no `down()` functions. To revert a schema change, write a new migration that reverses it. This keeps the migration history linear and avoids the false confidence of untested rollback scripts.

### Adding a new migration

1. Create a new file with the next number in sequence: `0XX_description.ts`
2. Export an `up` function and run `pnpm db:migrate`

### PostGraphile and custom mutations

PostGraphile auto-exposes queries and mutations for every table. For operations that go beyond simple CRUD — or that need to run multiple statements atomically — implement a PostgreSQL function and PostGraphile will expose it as a GraphQL mutation automatically.

---

## Testing

Tests use **Vitest** and **Testing Library**. The web app uses **MSW (Mock Service Worker)** to intercept GraphQL requests at the network level — tests never call the real API.

```bash
pnpm test:web       # Run web tests (Vitest)
pnpm test:api       # Run API unit tests (fast, DB-free)
pnpm test:api:int   # Run API integration tests (needs docker:up + test:db:setup)
```

API tests are split: `pnpm test:api` runs unit tests only and never touches a
database. Integration tests (`*.integration.test.ts`) hit a real Express +
PostGraphile stack against the `nudo_test` database — start Docker
(`pnpm docker:up`), create the test DB once (`pnpm test:db:setup`), then run
`pnpm test:api:int`.

**Run only the tests relevant to your change** — not the full suite:

```bash
# Filter by filename (no extension needed, partial match works)
pnpm vitest run document-page
pnpm vitest run save-bar manuscripts-section
```

MSW handlers are defined in `apps/web/src/test/mocks/`. The test setup (`src/test/setup.ts`) starts the MSW server before all tests, resets handlers between tests, and clears localStorage.

---

## Commands

| Command              | Description                                   |
| -------------------- | --------------------------------------------- |
| `pnpm dev`           | Run web + api in parallel                     |
| `pnpm test:web`      | Run web tests (Vitest)                        |
| `pnpm test:api`      | Run API unit tests (fast, DB-free)            |
| `pnpm test:api:int`  | Run API integration tests (needs test DB)     |
| `pnpm test:db:setup` | Create/migrate the `nudo_test` database       |
| `pnpm storybook`     | UI component explorer (port 6006)             |
| `pnpm lint`          | Lint entire monorepo                          |
| `pnpm db:migrate`    | Run pending migrations (requires `docker:up`) |
| `pnpm docker:up`     | Start PostgreSQL container                    |
| `pnpm docker:down`   | Stop PostgreSQL container                     |

> `pnpm test` (root) is not fully configured — use `pnpm test:web` or `pnpm test:api` instead.

---

## Environment Variables

The API reads a single `.env` at the **repo root**; the web app reads its own `apps/web/.env` (Vite convention). Copy both examples and fill in any placeholders:

```bash
cp .env.example .env                    # API — repo root
cp apps/web/.env.example apps/web/.env  # web
```

The root `.env.example` uses the dev credentials defined in `docker-compose.yml`. Replace `JWT_SECRET` with a random string before running the API.

---

## Git Workflow

`main` is always deployable. Non-trivial work lands through a short-lived branch and a squash-merged pull request; commits follow [Conventional Commits](https://www.conventionalcommits.org/). See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full workflow.

---

## Local Hooks

Husky runs automated checks at commit and push time so issues are caught before they hit the remote. `pnpm install` is the only install step — the `prepare` script wires everything up.

### What runs when

**On every `git commit`** (`.husky/pre-commit`, via lint-staged):

- `prettier --write` — formats staged files
- `eslint --fix` — lints staged code; `console.log` and `debugger` are errors
- `secretlint` — blocks committed secrets (AWS, GitHub, Slack, Stripe, DB connection strings, private keys, …)

Runs only on staged files. Typical single-file commit completes in ~3–5 seconds.

**On every `git push`** (`.husky/pre-push`):

- `commitlint` — every commit being pushed must follow Conventional Commits (`feat:`, `fix:`, `chore:`, …)
- `pnpm typecheck` — runs `tsc --noEmit` across `apps/web` and `apps/api`

### WIP commits

Conventional Commits are enforced **at push time**, not commit time. You can freely:

```bash
git commit -m "wip"
git commit -m "trying something"
```

…and clean up with `git rebase -i` before pushing. The pre-push hook checks the full range against `origin/main` (new branch) or against the last pushed commit (existing branch).

### Escape hatch

If you genuinely need to bypass the hooks:

```bash
git commit --no-verify
git push --no-verify
```

Use sparingly — CI runs the same checks (lint, typecheck, tests) on every push and PR.
