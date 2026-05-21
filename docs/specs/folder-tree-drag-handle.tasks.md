# Tasks: Folder Tree Drag Handle Affordance

> Status: Implemented
> Spec: [`folder-tree-drag-handle.md`](./folder-tree-drag-handle.md)
> Plan: [`folder-tree-drag-handle.plan.md`](./folder-tree-drag-handle.plan.md)
> Branch: `feat/add-drag-icon`

**Verification = `pnpm typecheck` + manual eye.** No jsdom/RTL unit tests for this work — pure CSS hover changes aren't meaningfully testable in jsdom (see Plan §"Verification approach").

---

## Task 1 — FolderItem hover swap (chevron ↔ grip) ✓

**Acceptance**

- Default render of `<FolderItem isOpen={false}>` shows the chevron icon, no grip visible.
- Hovering inside the `SidebarMenuButton` (name + chevron region) reveals the grip and hides the chevron. Mouse-leave reverts.
- Hovering the edit or delete action button does NOT trigger the swap.
- `isOpen={true}` continues to apply `rotate-90` on the chevron when grip is not active.
- Row layout width does not shift on hover (both icons `h-4 w-4`, mutually exclusive).
- `memo(...)` wrapper preserved. No `useState` introduced for hover.

**Implementation**

- All lucide icons migrated to `<Icon name="..." />` (project convention).
- `group/folder-icon` applied to the `SidebarMenuButton`.
- Both icons rendered inside the button, toggled via `group-hover/folder-icon:hidden` / `:block`.

**Files**

- `apps/web/src/features/folder/components/folder-item.tsx`

---

## Task 2 — TreeItem hover swap (file icon ↔ grip) ✓

**Acceptance**

- Default render of `<TreeItem>` shows the configured `ItemIcon` (default fileText), no grip visible.
- Hovering inside the `SidebarMenuButton` reveals the grip; mouse-leave reverts.
- Hovering edit/delete `SidebarMenuAction` does NOT trigger the swap.
- A `config.itemIcon` consumer renders correctly when not hovered, and the swap still works for it (consumer must forward `className`).
- `isActive` highlighting unaffected. Click still fires `onClick(domainId)`.
- `memo(...)` wrapper preserved. No `useState` for hover.

**Implementation**

- All lucide icons migrated to `<Icon name="..." />`.
- `group/tree-icon` applied to the `SidebarMenuButton`.
- Default icon path uses `<Icon name="fileText" />`; custom `config.itemIcon` path receives the same `group-hover/tree-icon:hidden` className.
- `manuscripts-section.tsx:171` updated to forward `className` so the swap works for its `itemIcon` callback.

**Files**

- `apps/web/src/features/folder/components/tree-item.tsx`
- `apps/web/src/features/sidebar/components/sections/manuscripts-section.tsx`

---

## Task 3 — Icon registry + dependency hygiene ✓

This task emerged during implementation and bundles two adjacent fixes.

**Acceptance**

- `packages/ui/src/components/icon/icon.tsx` registers `chevronRight`, `gripVertical`, and `pen`.
- `apps/web/package.json` declares `lucide-react` and `typescript` as direct dependencies (previously phantom — used but undeclared, only resolvable via pnpm hoisting in dev/build).
- `pnpm typecheck` works from the repo root without environment workarounds.

**Files**

- `packages/ui/src/components/icon/icon.tsx`
- `apps/web/package.json`
- `pnpm-lock.yaml`

---

## Task 4 — Integration verification ✓

**Acceptance**

- All hover behaviors work together with no interaction bugs.
- Existing DnD reorder + persistence behavior unchanged (drag works, order persists after refresh).
- `pnpm typecheck` clean.
- Spec, Plan, Tasks docs marked `Implemented`.

**Verification checklist** (final pass in `pnpm dev`)

- [x] Folder row hover → chevron becomes grip
- [x] Open folder row hover → grip; on leave, chevron rotates back correctly
- [x] Document row hover → file icon becomes grip
- [x] Hover edit/delete on either → no swap, action button hover state fires normally
- [x] Reorder still works (visual confirmation from user)
- [x] `pnpm typecheck` → clean
