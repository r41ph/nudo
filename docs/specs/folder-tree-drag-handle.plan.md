# Plan: Folder Tree Drag Handle Affordance

> Status: Implemented
> Spec: [`folder-tree-drag-handle.md`](./folder-tree-drag-handle.md)
> Branch: `feat/add-drag-icon`

## Approach summary

Two CSS-only hover swaps:

| #   | Component                  | File              | Mechanism                                                                                                                                                                              |
| --- | -------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Hover swap (folder rows)   | `folder-item.tsx` | New `group/folder-icon` Tailwind scope around `SidebarMenuButton`; render both chevron + `gripVertical` and toggle visibility via `group-hover/folder-icon:` utilities — no `useState` |
| B   | Hover swap (document rows) | `tree-item.tsx`   | Same pattern as A; swap `fileText` (or `config.itemIcon`) ↔ `gripVertical`                                                                                                             |

Tailwind hover-group scopes (not React state) keep this zero re-render cost.

Cursor state during drag is left to the browser (no custom handling).

## Why these mechanisms

### Hover swap — Tailwind group vs. React state

- **Chosen**: two-icon render + Tailwind `group/<name>` + `group-hover/<name>:hidden` / `:block`. Zero re-renders.
- **Rejected — `useState(isHovered)`**: triggers a re-render per pointer-enter/leave on every row in the sidebar. Bad for trees with many items, and contradicts existing pattern (`group/folder-row` is already used).

### Hover-scope shape

`FolderItem` already has `group/folder-row` covering the whole row (used for action-button visibility). We add a **second, narrower** scope `group/folder-icon` around just the `SidebarMenuButton` (which contains chevron + name). This gives us: hovering name area → grip appears; hovering edit/delete → grip stays as chevron because we're outside the inner scope.

`TreeItem` doesn't use a row-level group (action visibility is handled by shadcn's `SidebarMenuAction showOnHover`). We add `group/tree-icon` around its `SidebarMenuButton` only — no row-level scope needed.

## Side fixes that came with this work

1. **Icon component migration** — per project convention, lucide-react icons are not imported directly; they go through `packages/ui/src/components/icon/icon.tsx` and are used via `<Icon name="..." />`. While touching `folder-item.tsx` and `tree-item.tsx`, all direct lucide imports in those files were migrated. Registry gained `chevronRight`, `gripVertical`, `pen`.
2. **`itemIcon` className passthrough** — `manuscripts-section.tsx:171` previously passed `() => <Icon name="fileText" />`, ignoring the `className` prop. For the hover swap to work in the only current consumer, the callback was changed to forward className.
3. **Phantom dep cleanup** — `apps/web/package.json` now declares `lucide-react` and `typescript` (both were used by source code in apps/web but not declared, working only via pnpm hoisting in dev/build).

## Verification approach

No jsdom/RTL unit tests for this work. This is a pure CSS hover/visibility change, and jsdom does not fire `:hover`, so any RTL test could only assert that the expected `className` strings are present in the markup — circular (tests the implementation, not the behavior). Per `.claude/rules/testing.md` ("test observable behavior, not implementation details"), low-signal tests are worse than no tests.

Verification:

- **`pnpm typecheck`** — catches type/JSX errors across `apps/web` and `apps/api`.
- **Manual eye** — verify in `pnpm dev`: hover folder/document rows → icon swaps; hover edit/delete → no swap.

## Touchpoints

```
apps/web/src/features/folder/components/
├── folder-item.tsx                          ← chevron ↔ grip swap, migrate to <Icon>
└── tree-item.tsx                            ← file ↔ grip swap, migrate to <Icon>
apps/web/src/features/sidebar/components/sections/
└── manuscripts-section.tsx                  ← forward className in itemIcon callback
packages/ui/src/components/icon/icon.tsx     ← register chevronRight, gripVertical, pen
apps/web/package.json                        ← declare lucide-react + typescript
```

No changes to `folder-tree.tsx`, `folder-tree.types.ts`, `folder.api.ts`, or anything in `packages/ui/src/components/ui/`.

## Out of plan (out of scope per spec)

- DnD library swap, handle-only drag, touch/mobile, keyboard reorder, persistence changes, custom drag cursor.
