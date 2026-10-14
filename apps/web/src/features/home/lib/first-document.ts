import type { NodeKind } from '@web/shared/types/outline.types';

export interface HomeNode {
  id: string;
  kind: NodeKind;
  parentId: string | null;
  position: number;
}

// Positions are per sibling group, so a flat sort ties a folder with its own
// first child; only a depth-first walk gives the order the sidebar shows.
export function firstDocumentId(nodes: HomeNode[]): string | null {
  const children = new Map<string | null, HomeNode[]>();
  for (const n of nodes) {
    const siblings = children.get(n.parentId) ?? [];
    siblings.push(n);
    children.set(n.parentId, siblings);
  }
  for (const siblings of children.values()) {
    siblings.sort((a, b) => a.position - b.position);
  }

  let firstFolder: string | null = null;
  const stack = [...(children.get(null) ?? [])].reverse();
  while (stack.length) {
    const n = stack.pop() as HomeNode;
    if (n.kind === 'document') return n.id;
    if (n.kind === 'folder') firstFolder ??= n.id;
    stack.push(...[...(children.get(n.id) ?? [])].reverse());
  }
  return firstFolder;
}
