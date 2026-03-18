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

## Conventions

- Filenames: kebab-case. Components: PascalCase.
- Config values go in `constants/` dirs with domain-specific files (e.g., `toolbar.constants.ts`)
- Conventional Commits format: `feat:`, `fix:`, `refactor:`, etc.
- Do not include `Co-Authored-By:` lines in commits

## Maintenance

If you encounter a non-obvious command, convention, or gotcha that isn't covered by context7 and would cause mistakes without being documented, propose an addition to this file. Do not add anything discoverable from reading the code.
