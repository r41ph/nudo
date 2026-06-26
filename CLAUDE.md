## Commands

```bash
pnpm dev                   # Run web + api in parallel
pnpm test:web              # Run web tests (Vitest)
pnpm test:api              # Run API unit tests (fast, DB-free)
pnpm test:api:int          # Run API integration tests (needs docker:up + test:db:setup)
pnpm test:db:setup         # Create/migrate the nudo_test database
pnpm storybook             # UI component explorer (port 6006)
pnpm lint                  # Lint entire monorepo
pnpm db:migrate            # Run pending migrations (requires docker:up)
pnpm docker:up             # Start PostgreSQL
```

Note: `pnpm test` (root) fails because `packages/ui` has no test runner configured yet — use `pnpm test:web` instead.

## Feature Workflow

You execute features following this lifecycle. **Before you start,** the human
decides if the change is trivial (docs-only, config, typos) and commits it
directly to `main`, or non-trivial and needs a branch + PR.

**For non-trivial changes (features, logic, UI):**

1. **Worktree.** Work in a git worktree for this feature (the human may set this
   up, or you can create one:
   `git fetch origin && git worktree add -b feature-name ../feature-name origin/main`).
   Worktrees keep branch state isolated so file changes don't leak across
   features. Never work on a shared branch.
2. **Read the source of truth.** A feature is grounded in **either** a spec
   (`docs/specs/<feature>.md`) **or** a design handoff
   (`docs/design-handoffs/<feature>/` — see below). If neither exists, ask the
   human before proceeding — the feature should have been specced or handed off
   first.
3. **Implement from it.** Build exactly what the spec / handoff requires. If you
   discover it is incomplete or wrong, flag it before coding further.
4. **TDD.** Write failing tests first for logic and bug fixes (regression test
   before the fix). Satisfy every test layer the [required-tests
   matrix](.claude/rules/testing.md) mandates — unit + integration always;
   e2e only for cross-cutting user journeys.
5. **Storybook stories.** Ship `*.stories.tsx` for every new or changed UI
   component, covering meaningful states. Skip for API-only work.
6. **Error handling.** Never swallow errors. Web: surface failures to the user
   (SaveBar, error states). API: return correct status codes (400/401/404/409…)
   with no internals leaked. See `frontend.md` / `api.md` rules.
7. **Update docs.** If behavior, APIs, commands, or env vars change, update
   `CLAUDE.md` and `.claude/rules/*` if conventions changed.
8. **Finalize the PR.** When all changes are committed, push the branch and open
   the PR. Point the PR description at the source of truth
   (`Spec: docs/specs/<feature>.md` or
   `Design handoff: docs/design-handoffs/<feature>/README.md`). Then record the
   PR URL back in that doc (`> Status: <state> (PR #NN — <url>)`) and commit it
   into the same PR. The doc and PR must link to each other.

**Feature is done** when the [testing DoD](.claude/rules/testing.md) passes and
the spec or handoff (if one exists) links to the PR.

**For trivial changes** (docs, config, typos): the human commits directly to
`main`. You don't handle these.

**Design-handoff workflow.** Some features arrive as a **design handoff** instead
of a written spec: a prototype plus a scope doc produced in Claude design, then
implemented here in Claude Code. They are two ends of one pipeline — the handoff
is the _what/why_, the implementation is the _how_.

- **Location:** one bundle per feature under `docs/design-handoffs/<feature>/`.
- **Authoritative:** the bundle's `README.md` — its "what changes vs. current
  code" scope table is the contract. The prototype files (HTML / Babel JSX) are
  a **visual reference, not code to copy**: restyle/extend the existing codebase
  with its own patterns and components, changing as little as possible.
- **Frozen:** a committed handoff is a point-in-time reference; don't update it
  as the implementation evolves. Capture later changes in the PR or a spec.
- **Linking:** commit the bundle (a `docs:` commit) and reference it from the PR
  like a spec (`Design handoff: docs/design-handoffs/<feature>/README.md`).

## Path Aliases

- `@api/*` → `apps/api/src/*`
- `@web/*` → `apps/web/src/*`
- `@ui/*` → `packages/ui/src/*`

Always use these; never use relative paths across packages.

## Library APIs

**IMPORTANT: Always use context7 MCP before writing code that uses any library.**

1. `mcp__context7__resolve-library-id` — resolve the library
2. `mcp__context7__query-docs` — query the specific topic

## Components

- Use `@ui/components/ui/*` components first
- To add a missing component: `npx shadcn@latest add <component>` (targets `packages/ui/components.json`)
- **Do not modify** `packages/ui/src/components/ui/` — these are shadcn-managed
- Never use raw `<button>`, `<input>`, or `<label>` when a UI component exists

## Testing

See `.claude/rules/testing.md` for the **required-tests matrix** (change type →
mandated layers) and the **feature definition-of-done** — every change must
bring the test layers its type requires. The rule auto-loads when you read files
under `apps/web/src` or `apps/api/src`.

- Only run tests related to the files changed — never the full suite unless explicitly asked.
- Filter by filename (no extension needed): `pnpm vitest run save-bar manuscripts-section`
- Vitest matches the filter against the full file path, so a partial name is enough.
- API integration tests (`*.integration.test.ts`) run via `pnpm test:api:int`
  and need Docker up + `pnpm test:db:setup` (they hit the `nudo_test` database,
  never the dev DB). Plain `pnpm test:api` stays unit-only and DB-free.

## Conventions

- Filenames: kebab-case. Components: PascalCase.
- Config values go in `constants/` dirs with domain-specific files (e.g., `toolbar.constants.ts`)
- Conventional Commits format: `feat:`, `fix:`, `refactor:`, etc.
- Do not include `Co-Authored-By:` lines in commits

## AI tool configuration

Always query the official Claude Code documentation before creating or modifying any Claude configuration files. Do not rely on training data for this — conventions change between versions.

## Local Hooks

Husky runs checks at commit and push time. Don't manually re-run what the hooks already cover — wasted tokens.

**Pre-commit** (`.husky/pre-commit` → lint-staged on staged files only):

- prettier `--write`
- eslint via `eslint.config.precommit.mts` (adds `no-console` / `no-debugger` as errors)
- secretlint (preset-recommend rules)

**Pre-push** (`.husky/pre-push`):

- commitlint on the commits being pushed (new branch: range from `merge-base` with `origin/main`; existing branch: range from last pushed commit)
- `pnpm typecheck` across `apps/web` and `apps/api` (covers `packages/ui` transitively via `apps/web`'s `tsc -b`)

**WIP commits are allowed.** Conventional Commits are enforced at push time, not commit time. Don't fight this — commit `wip` freely if helpful and assume the user will `rebase -i` before pushing. Don't preemptively block or rewrite their `wip` commits.

**`--no-verify` is an escape hatch, not a default.** Never bypass hooks for committed work without explicit user instruction.

**Config files** (modify these to if instructed to change hook behavior):

- `.husky/pre-commit`, `.husky/pre-push` — hook scripts
- `eslint.config.precommit.mts` — extends base ESLint config with stricter pre-commit rules
- `commitlint.config.mjs` — Conventional Commits config
- `.secretlintrc.json` — secretlint rule preset
- `.secretlintignore` — files secretlint should skip (e.g., `.env.example`, lockfile)
- `package.json` — `lint-staged` block (which globs run which checks)

## Maintenance

If you encounter a non-obvious command, convention, or gotcha that isn't covered by context7 and would cause mistakes without being documented, propose an addition to this file. Do not add anything discoverable from reading the code.
