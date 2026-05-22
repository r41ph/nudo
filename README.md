# Nudo.Ink

A full-stack writing application built for long-form writing. Users organise their work into folders, write in a rich text editor with a customisable toolbar, and have their work saved automatically as they type.

## Features

- **Rich text editor** — powered by Plate.js. Supports headings, bold, italic, underline, strikethrough, blockquotes, code blocks, font size and colour, highlight, and text alignment
- **Customisable toolbar** — users choose which tools appear in their toolbar; preferences are persisted per user
- **Comments and suggestions** — inline annotations and tracked suggestions for reviewing and collaborating on documents
- **Document management** — create, rename, and delete documents
- **Folder organisation** — group documents into folders with drag-and-drop reordering
- **Auto-save** — content is saved automatically with a 2.5 s debounce; a status indicator shows save state
- **Document versioning** — previous versions are stored automatically and can be restored
- **Authentication** — JWT-based login and registration with access/refresh token rotation
- **Word count** — live word count tracked per document

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
  folder/
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

**Prerequisites:** Node.js 20+, pnpm 10+, Docker

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill in environment variables (see Environment Variables below)
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env

# 3. Start PostgreSQL
pnpm docker:up

# 4. Run database migrations
pnpm db:migrate

# 5. Start dev servers
pnpm dev
```

| Service     | URL                           |
| ----------- | ----------------------------- |
| Web app     | http://localhost:5173         |
| GraphQL API | http://localhost:3000/graphql |
| Storybook   | http://localhost:6006         |

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

### Naming conventions

- **Files:** kebab-case (`document-page.tsx`, `use-auto-save.ts`)
- **Components:** PascalCase (`DocumentPage`, `SaveBar`)
- **Types:** `<feature>.types.ts` at the feature root (e.g., `auth.types.ts`)
- **Constants:** `<feature>.constants.ts` at the feature root (e.g., `toolbar.constants.ts`); export as `const` objects
- **Commits:** Conventional Commits — `feat:`, `fix:`, `refactor:`, `chore:`, etc.

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
pnpm test:web   # Run all web tests
pnpm test:api   # Run all API tests
```

**Run only the tests relevant to your change** — not the full suite:

```bash
# Filter by filename (no extension needed, partial match works)
pnpm vitest run document-page
pnpm vitest run save-bar manuscripts-section
```

MSW handlers are defined in `apps/web/src/test/mocks/`. The test setup (`src/test/setup.ts`) starts the MSW server before all tests, resets handlers between tests, and clears localStorage.

---

## Commands

| Command            | Description                                   |
| ------------------ | --------------------------------------------- |
| `pnpm dev`         | Run web + api in parallel                     |
| `pnpm test:web`    | Run web tests (Vitest)                        |
| `pnpm test:api`    | Run API tests (Vitest)                        |
| `pnpm storybook`   | UI component explorer (port 6006)             |
| `pnpm lint`        | Lint entire monorepo                          |
| `pnpm db:migrate`  | Run pending migrations (requires `docker:up`) |
| `pnpm docker:up`   | Start PostgreSQL container                    |
| `pnpm docker:down` | Stop PostgreSQL container                     |

> `pnpm test` (root) is not fully configured — use `pnpm test:web` or `pnpm test:api` instead.

---

## Environment Variables

Copy the `.env.example` files in each app to `.env` and fill in any placeholders:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

`apps/api/.env.example` uses the dev credentials defined in `docker-compose.yml`. Replace `JWT_SECRET` and `JWT_REFRESH_SECRET` with random strings before running the API.

---

## Git Workflow

### Branch structure

- `main` — always production-ready. Nothing lands here without a pull request.
- `feature/*` — short-lived branches cut from `main`. One branch per feature or fix.

### Step-by-step flow

#### 1. Start a feature

```bash
git checkout main
git pull
git checkout -b feature/my-feature
```

#### 2. Work on the feature

Commit as you go using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, etc.).
To keep your branch up-to-date with `main` and ensure a clean history, rebase frequently:

```bash
git fetch origin
git rebase origin/main
```

Because rebasing rewrites history, a standard `push` will be rejected. Use `--force-with-lease` to update your remote branch safely:

```bash
# Safely update your remote feature branch after a rebase
git push --force-with-lease
```

**Note**: Prefer `--force-with-lease` over `--force` because it won't overwrite the remote branch if someone else has pushed new commits to it since your last fetch.

#### 3. Open a pull request

Push your branch and open a PR against `main`. The PR description should explain what the change does and why.

```bash
git push -u origin feature/my-feature
```

#### 4. Review and merge

Once approved, merge the PR into `main`. Delete the feature branch after merging.

#### Squash and Merge via UI or CLI:

You can use GitHub "Squash and Merge" button. This combines all commits from feature/my-feature into a single commit on main.

Commit Message: Use a Conventional Commit message for the squash commit (e.g., feat: add user authentication).

#### Clean up local and remote:

```bash
# Switch back to main
git checkout main

# Pull the new squash commit from origin
git pull

# Delete the local feature branch
git branch -d feature/my-feature

# Delete the remote branch (or use Github UI)
git push origin --delete feature/my-feature
```

### Rules

- Never commit directly to `main`.
- `main` must always be in a deployable state.
- Keep feature branches short. Long-running branches lead to painful merges.

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

Use sparingly — CI will eventually run the same checks.
