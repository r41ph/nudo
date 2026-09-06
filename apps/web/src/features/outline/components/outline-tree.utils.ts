import type { OutlineNode } from '@web/shared/types/outline.types';
import type { TreeMap } from '@web/features/outline/components/outline-tree.types';

/**
 * Builds the headless-tree map from the flat outline node list. Children are
 * grouped by `parentId` (null = root) and ordered by position. Each node's
 * displayed word count is rolled up across its whole subtree.
 */
export function buildTreeMap(nodes: OutlineNode[]): TreeMap {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string | null, OutlineNode[]>();
  for (const node of nodes) {
    const group = childrenOf.get(node.parentId) ?? [];
    group.push(node);
    childrenOf.set(node.parentId, group);
  }
  for (const group of childrenOf.values()) {
    group.sort((a, b) => a.position - b.position);
  }

  // Own words + every descendant's, memoised. The `visiting` guard makes the
  // recursion safe even if the data contains a cycle (it never should, but a
  // direct parent_id patch could in theory create one) — a re-entered node
  // contributes only its already-accumulated share instead of looping forever.
  const rolled = new Map<string, number>();
  const visiting = new Set<string>();
  const rolledWordCount = (id: string): number => {
    const cached = rolled.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return byId.get(id)?.wordCount ?? 0;
    visiting.add(id);
    const own = byId.get(id)?.wordCount ?? 0;
    const total = (childrenOf.get(id) ?? []).reduce(
      (sum, child) => sum + rolledWordCount(child.id),
      own
    );
    visiting.delete(id);
    rolled.set(id, total);
    return total;
  };

  const map: TreeMap = {
    root: {
      item: { type: 'root' },
      children: (childrenOf.get(null) ?? []).map((n) => n.id),
    },
  };

  for (const node of nodes) {
    const children = childrenOf.get(node.id) ?? [];
    map[node.id] = {
      item: {
        type: 'node',
        id: node.id,
        title: node.title,
        kind: node.kind,
        status: node.status,
        wordCount: rolledWordCount(node.id),
        hasChildren: children.length > 0,
      },
      children: children.map((c) => c.id),
    };
  }

  return map;
}

/**
 * How many nodes sit inside `id`'s subtree, excluding `id` itself — the blast
 * radius a cascading delete would take with it. The `seen` set keeps this
 * terminating even if the map ever contained a cycle.
 */
export function countDescendants(map: TreeMap, id: string): number {
  const seen = new Set([id]);
  const stack = [...(map[id]?.children ?? [])];
  let count = 0;
  while (stack.length) {
    const current = stack.pop() as string;
    if (seen.has(current)) continue;
    seen.add(current);
    count++;
    stack.push(...(map[current]?.children ?? []));
  }
  return count;
}

export type TreeStore = {
  getSnapshot: () => TreeMap;
  subscribe: (listener: () => void) => () => void;
  set: (next: TreeMap) => void;
  mutateChildren: (itemId: string, newChildren: string[]) => void;
};

export function createTreeStore(initial: TreeMap): TreeStore {
  let data = initial;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  return {
    getSnapshot: () => data,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (next) => {
      if (Object.is(data, next)) return;
      data = next;
      notify();
    },
    mutateChildren: (itemId, newChildren) => {
      const existing = data[itemId];
      if (!existing) return;
      data = {
        ...data,
        [itemId]: { ...existing, children: newChildren },
      };
      notify();
    },
  };
}
