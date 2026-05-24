import type {
  TreeFolderItem,
  TreeLeafItem,
  TreeMap,
} from '@web/features/folder/components/folder-tree.types';

export function buildTreeMap(
  folders: TreeFolderItem[],
  rootItems: TreeLeafItem[]
): TreeMap {
  const map: TreeMap = {};

  // Interleave folders + root docs sorted by position
  const rootEntries = [
    ...folders.map((f) => ({ id: `folder-${f.id}`, position: f.position })),
    ...rootItems.map((d, i) => ({
      id: `doc-${d.id}`,
      position: d.position ?? i,
    })),
  ].sort((a, b) => a.position - b.position);

  map['root'] = {
    item: { type: 'root' },
    children: rootEntries.map((e) => e.id),
  };

  for (const folder of folders) {
    map[`folder-${folder.id}`] = {
      item: { type: 'folder', domainId: folder.id, name: folder.name },
      children: folder.items.map((d) => `doc-${d.id}`),
    };
    for (const doc of folder.items) {
      map[`doc-${doc.id}`] = {
        item: { type: 'document', domainId: doc.id, title: doc.title },
        children: [],
      };
    }
  }

  for (const doc of rootItems) {
    map[`doc-${doc.id}`] = {
      item: { type: 'document', domainId: doc.id, title: doc.title },
      children: [],
    };
  }

  return map;
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
