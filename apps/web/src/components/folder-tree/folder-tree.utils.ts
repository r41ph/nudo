import type { ItemsRecord } from './folder-tree.types';

export function parseId(
  sortableId: string
): { type: 'folder' | 'item'; id: string } | null {
  if (sortableId.startsWith('folder-')) {
    return { type: 'folder', id: sortableId.replace('folder-', '') };
  }
  if (sortableId.startsWith('item-')) {
    return { type: 'item', id: sortableId.replace('item-', '') };
  }
  return null;
}

export function findContainer(
  items: ItemsRecord,
  id: string
): string | undefined {
  // Prefer finding the container that actually contains this item.
  const found = Object.keys(items).find((key) => items[key].includes(id));
  if (found) return found;

  // If id is a container key itself, return it as a fallback
  if (id in items) return id;

  return undefined;
}
