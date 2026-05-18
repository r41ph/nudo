## Commands

```bash
pnpm dev                   # Run web + api in parallel
pnpm test:web              # Run web tests (Vitest)
pnpm test:api              # Run API tests (Vitest)
pnpm storybook             # UI component explorer (port 6006)
pnpm lint                  # Lint entire monorepo
pnpm db:migrate            # Run pending migrations (requires docker:up)
pnpm docker:up             # Start PostgreSQL
```

Note: `pnpm test` (root) fails because `packages/ui` has no test runner configured yet — use `pnpm test:web` instead.

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

- Only run tests related to the files changed — never the full suite unless explicitly asked.
- Filter by filename (no extension needed): `pnpm vitest run save-bar manuscripts-section`
- Vitest matches the filter against the full file path, so a partial name is enough.

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
