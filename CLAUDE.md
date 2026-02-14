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
- `apps/api` - Backend API (stub — no source code yet)
- `packages/ui` - Shared component library with Storybook

### Key Technologies
- **Editor**: Plate.js (`platejs`) - Rich text editor built on Slate
- **Styling**: Tailwind CSS v4 (CSS-based config via `@tailwindcss/vite`, no tailwind.config.js)
- **State**: Jotai atoms for global state
- **UI Primitives**: Radix UI, Ariakit
- **Testing**: Vitest + Playwright (configured in packages/ui, integrated with Storybook)

### Web App Structure (`apps/web/src`)
- Path alias: `@web` → `./src`
- `components/` - App-specific components (`app-sidebar/`, `layout/`, `toolbar-dialog/`, `tools-sidebar/`)
- `state/` - Jotai atoms: `dialogAtom` (active dialog state), `enabledToolsAtom` (toolbar tool toggles, default: `['bold', 'italic']`)
- `constants/` - Constants for dialog and toolbar configuration
- `types/` - TypeScript types for dialog and toolbar
- `components.json` - shadcn/ui configuration

### UI Package Structure (`packages/ui/src`)
- Path alias: `@ui` → `../../packages/ui/src`
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
