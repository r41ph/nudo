import type { NodeKind } from '@web/shared/types/outline.types';

export type NodeForScope = {
  id: string;
  parentId: string | null;
  title: string;
  kind: NodeKind;
};

export interface CreateScope {
  parentId: string | null;
  chapterTitle: string | null;
}

const ROOT: CreateScope = { parentId: null, chapterTitle: null };

// The open node's nearest enclosing chapter (itself, if it is one). Separators
// can't contain anything, so they never scope; `seen` guards against a cycle.
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
