import type { NodeKind } from '@web/shared/types/outline.types';

export type NodeForScope = {
  id: string;
  parentId: string | null;
  title: string;
  kind: NodeKind;
};

export interface CreateScope {
  /** Where a new node should be created. `null` = the root. */
  parentId: string | null;
  /** The chapter's title, or `null` when the scope is the root. */
  chapterTitle: string | null;
}

const ROOT: CreateScope = { parentId: null, chapterTitle: null };

/**
 * Which chapter the footer's "New" button should create into, given whatever is
 * open in the editor. The open node's nearest enclosing chapter wins — itself,
 * if it is one — so the button can name its scope instead of leaving the user
 * to guess whether it adds at the root or under the selection.
 *
 * Separators can't contain anything, so they are never a scope; a node with no
 * chapter above it falls back to the root. The `seen` set keeps the walk
 * terminating even if the data ever contained a parent cycle.
 */
export function pickCreateScope(
  nodes: NodeForScope[],
  activeId: string | undefined
): CreateScope {
  if (!activeId) return ROOT;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();

  let current = byId.get(activeId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.kind === 'folder') {
      return { parentId: current.id, chapterTitle: current.title };
    }
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return ROOT;
}
