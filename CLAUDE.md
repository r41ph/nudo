# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev           # Run both web and api in parallel
pnpm dev:web       # Run web app only (Vite on default port)
pnpm storybook     # Run Storybook for UI components (port 6006)

# Linting
pnpm lint          # Lint entire monorepo
pnpm lint:workspaces  # Lint all apps and packages

# Build
pnpm --filter @writing-app/web build  # Build web app
```

Requires Node 20 (see `.nvmrc`).

## Architecture

This is a pnpm monorepo with:

- `apps/web` - Vite + React 19 frontend using Plate.js rich text editor
- `apps/api` - Express + PostGraphile backend API
- `packages/ui` - Shared component library with Storybook

**Path Aliases:**

- `@api/*` → `apps/api/src/*` (API imports)
- `@web/*` → `apps/web/src/*` (Web app imports)
- `@ui/*` → `packages/ui/src/*` (Available in web app)

### Key Technologies

- **Editor**: Plate.js (`platejs`) - Rich text editor built on Slate
- **Styling**: Tailwind CSS v4 (CSS-based config via `@tailwindcss/vite`, no tailwind.config.js)
- **State**: Jotai atoms for global state
- **Data Fetching**: TanStack Query + graphql-request (for both GraphQL and REST)
- **GraphQL**: graphql-request (lightweight client, no normalized cache)
- **UI Primitives**: shadcn
- **Testing**: Vitest + Playwright (configured in packages/ui, integrated with Storybook)

### API Structure (`apps/api/src`)

- `auth/` - Authentication utilities and routes
- `constants/` - Configuration constants (e.g., `auth.constants.ts`)

### Web App Structure (`apps/web/src`)

- `components/` - App-specific components (`app-sidebar/`, `layout/`, `toolbar-dialog/`, `tools-sidebar/`)
- `state/` - Jotai atoms: `dialogAtom` (active dialog state), `enabledToolsAtom` (toolbar tool toggles, default: `['bold', 'italic']`)
- `constants/` - Constants for dialog and toolbar configuration
- `types/` - TypeScript types for dialog and toolbar
- `components.json` - shadcn/ui configuration

### UI Package Structure (`packages/ui/src`)

- `components/ui/` - Reusable UI primitives (button, dialog, toolbar, etc.)
- `components/editor/` - Plate.js editor and toolbar buttons
- `components/editor/plugins/` - Plate.js plugin kits (see Editor Architecture below)
- `hooks/` - Custom hooks (`use-debounce`, `use-mounted`, `use-mobile`)
- `lib/utils.ts` - Shared utilities

### Editor Architecture

The `PlateEditor` component (`packages/ui/src/components/editor/plate-editor.tsx`) is the core editor:

- Combines multiple plugin kits: `BasicNodesKit`, `SuggestionKit`, `AlignKit`, `FontKit`
- FloatingToolbar renders conditionally based on `enabledTools` array
- Tools are toggled via `isEnabled(tool)` pattern

**Plugin kit hierarchy:**

- `BasicNodesKit` = `BasicBlocksKit` (paragraph, headings, blockquote, hr) + `BasicMarksKit` (bold, italic, underline, code, strikethrough, subscript, superscript, highlight, kbd)
- `SuggestionKit` = commentPlugin + discussionPlugin + suggestionPlugin
- `AlignKit` = text alignment
- `FontKit` = font color, background color, size, family

Each kit has a base variant (static components) and an interactive variant. Only the interactive variants are used in the editor.

### Component Conventions

- UI components use `class-variance-authority` (CVA) for variants
- Styling uses Tailwind with `cn()` utility from `@udecode/cn`
- Editor node components exist in both static and interactive variants (e.g., `blockquote-node.tsx` and `blockquote-node-static.tsx`)

## Database Conventions

### Migrations

- **Forward-only**: Migrations do not include `down()` functions. To undo a schema change, create a new migration that reverses it.
- Migration files live in `apps/api/src/db/migrations/` with numeric prefixes (e.g., `017_move-toolbar-to-users.ts`)

## Git Conventions

### Commit Messages

- Follow [Conventional Commits](https://www.conventionalcommits.org) format (e.g. `feat: add auto-save debounce to document editor`)
- Write the description as a concise sentence
- Do not include `Co-Authored-By: Claude` or any similar attribution lines

## Documentation and Library APIs

**Always use context7 MCP before writing code that uses any library or tool API.** Do not rely solely on training knowledge — APIs change between versions, and the project may use a version with different patterns than what was current at training time.

Before writing code that uses any library (React, Plate.js, TanStack Query, headless-tree, Tailwind, shadcn, Jotai, graphql-request, Vitest, Playwright, etc.):

1. Call `mcp__context7__resolve-library-id` with the library name
2. Call `mcp__context7__query-docs` with the resolved ID and the specific topic

This is a hard requirement, not a suggestion.

## Coding Conventions

### Consistency Across Monorepo

**Maintain consistent patterns across all apps and packages** to ensure a uniform codebase:

- **Constants**: Store configuration values in dedicated `constants/` directories with domain-specific files (e.g., `auth.constants.ts`, `toolbar.constants.ts`)
- **Directory structure**: Follow the same organizational patterns (e.g., `components/`, `hooks/`, `lib/`, `types/`)
- **Naming conventions**: Use consistent file naming (kebab-case for files, PascalCase for components)
- **Import patterns**: Use path aliases consistently (`@api`, `@web`, `@ui`) instead of relative paths

### Component Usage

- Always use components from `packages/ui` first (`@ui/components/ui/*`)
- If a component doesn't exist in the UI package, add it via shadcn (`npx shadcn@latest add <component>` using `packages/ui/components.json`)
- Never use raw HTML elements (`<button>`, `<input>`, `<label>`) when a UI component equivalent exists
- Update CLAUDE.md when adding or replacing technologies/libraries

### Exception: shadcn/ui Components

**Do not modify shadcn/ui components** (`packages/ui/src/components/ui/`) unless there's a functional requirement. These are generated/copied from shadcn and should remain unchanged to:

- Preserve compatibility with shadcn updates
- Avoid maintenance overhead
- Keep components consistent with shadcn documentation
