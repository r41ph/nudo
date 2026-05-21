# Spec: Folder Tree Drag Handle Affordance

> Status: Implemented
> Branch: `feat/add-drag-icon`

## Objective

Add a visible drag affordance to folder and document rows in the sidebar tree so users discover that rows are reorderable. Drag-and-drop is already wired up via `@headless-tree/core` (see `apps/web/src/features/folder/components/folder-tree.tsx`), but there is no visual cue — users have to guess. This spec covers **only the visual affordance**; the underlying DnD logic is unchanged, and the cursor state during drag is handled by the browser.

### User story

> As a user browsing the sidebar tree, when I hover over a folder or document's name area, the left icon transforms into a 6-dot grip icon so I know I can drag the row to reorder it.

### Success criteria

- [x] Hovering the name + left icon area of a `FolderItem` swaps the chevron icon for a `GripVertical` (lucide-react, 6 dots) icon.
- [x] Hovering the name + left icon area of a `TreeItem` (document row) swaps the file icon for `GripVertical`.
- [x] Hovering the edit or delete action button does NOT trigger the swap. The chevron/file icon remains visible; only the action button's own hover styling fires.
- [x] No horizontal layout shift occurs on swap (grip and chevron/file both occupy the same 16×16 slot, `h-4 w-4`).
- [x] No regression in existing DnD reorder behavior — folders/documents continue to reorder and persist as they do today.
- [x] The folder's open/closed visual state (currently shown via chevron rotation) is preserved when the swap is not active.

## Tech Stack

No new runtime dependencies. Uses what is already in the repo:

- React 19 + Vite (`apps/web`)
- `@headless-tree/react` + `@headless-tree/core` (DnD already integrated)
- `lucide-react` (icon library — `GripVertical` is the 6-dot icon)
- `@ui/components/ui/sidebar` (shadcn-managed sidebar primitives)
- Tailwind utility classes for hover groups and cursor styling

## Commands

Defined in `CLAUDE.md`; relevant ones for this work:

```bash
pnpm dev          # Run app to verify visually
pnpm typecheck    # Pre-push hook runs this; run locally before push
```

## Project Structure

Files this spec touches:

```
apps/web/src/features/folder/components/
├── folder-item.tsx                                  ← swap chevron ↔ GripVertical on hover
└── tree-item.tsx                                    ← swap file icon ↔ GripVertical on hover
apps/web/src/features/sidebar/components/sections/
└── manuscripts-section.tsx                          ← forward className in itemIcon callback
packages/ui/src/components/icon/icon.tsx             ← register chevronRight, gripVertical, pen
```

Implementation also added per-package dependency declarations (`lucide-react`, `typescript`) in `apps/web/package.json` — these were previously phantom dependencies (used but undeclared).

## Code Style

Follow patterns already used in `folder-item.tsx` and `tree-item.tsx`:

- Tailwind `group/<name>` + `group-hover/<name>:` for scoped hover triggers (already used: `group/folder-row`).
- `cn()` from `@ui/lib/utils` for conditional classes.
- Icons sized `h-4 w-4`, action buttons `h-5 w-5 [&_svg]:size-3.5` (already established).
- Keep component memoization (`memo(...)`) intact.
- Filenames: kebab-case (existing).

Example of the resulting hover-group structure (two nested scopes — one for the row, one narrower for the icon swap):

```tsx
<div className="group/folder-row flex items-center">
  <SidebarMenuButton className="group/folder-icon flex-1">
    <Icon
      name="chevronRight"
      className={cn(
        'h-4 w-4 shrink-0 transition-transform group-hover/folder-icon:hidden',
        isOpen && 'rotate-90'
      )}
    />
    <Icon
      name="gripVertical"
      className="hidden h-4 w-4 shrink-0 group-hover/folder-icon:block"
    />
    <span className="truncate">{name}</span>
  </SidebarMenuButton>
  {/* action buttons hidden until row hover */}
  <div className="hidden group-hover/folder-row:flex">…</div>
</div>
```

The inner `group/folder-icon` scope keeps the grip swap decoupled from the row-wide action-icon visibility.

## Testing Strategy

No jsdom/RTL unit tests for this work — it's a pure CSS hover/visibility change, and jsdom does not fire `:hover`. The only assertion such tests could make is "the className I wrote is in the markup," which is circular. Verification instead:

- **Manual verification in `pnpm dev`** — hover both folder and document rows; verify swap and no layout jitter.
- **`pnpm typecheck`** — catches type/JSX regressions across `apps/web`.

## Boundaries

- **Always do**
  - Use existing `@ui/components/ui/*` primitives (no raw `<button>` / `<div>` where a shadcn component fits).
  - Use Tailwind `group/<name>` hover scopes (existing pattern), not React `useState` for hover, to keep renders cheap.
  - Verify the visual behavior in a browser via `pnpm dev` before declaring done.

- **Ask first**
  - Modifying anything in `folder-tree.tsx` (the DnD logic is load-bearing and persistence-coupled).
  - Adding any new dependency.
  - Touching files outside `apps/web/src/features/folder/components/`.
  - Modifying anything under `packages/ui/src/components/ui/` (shadcn-managed).

- **Never do**
  - Change the DnD reorder behavior or persistence callbacks in `folder-tree.tsx`.
  - Introduce `react-dnd` or `dnd-kit` for this work (already on `@headless-tree/core`).
  - Add `useState` for hover state — Tailwind hover groups handle this without re-renders.

## Resolved Assumptions

1. **Icon**: `GripVertical` from `lucide-react` (6 dots arranged 2×3), accessed via the project's `<Icon name="gripVertical" />` registry.
2. **Cursor state during drag**: handled by the browser. No custom cursor work.
3. **Trigger zone**: "name + left icon" = the `SidebarMenuButton` area. The right-side action-button container is a separate hover scope.
4. **Editing mode**: row in rename mode shows the input, no icon, no handle.
5. **Drag preview**: left to headless-tree's default behavior.
6. **Touch / mobile**: out of scope — desktop hover only (consistent with existing edit/delete actions).
7. **Accessibility**: no keyboard-equivalent for "discovering draggability" in scope. Grip is purely a hover affordance.

## Out of Scope

- Reworking the DnD library or behavior.
- Drag-by-handle-only (whole row remains draggable).
- Touch / mobile drag affordance.
- Keyboard-accessible reorder.
- New persistence or API changes.
