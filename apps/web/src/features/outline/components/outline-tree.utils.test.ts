import { describe, it, expect } from 'vitest';
import { buildTreeMap } from '@web/features/outline/components/outline-tree.utils';
import type { TreeMap } from '@web/features/outline/components/outline-tree.types';
import type { OutlineNode } from '@web/features/outline/outline.types';

const node = (id: string, over: Partial<OutlineNode> = {}): OutlineNode => ({
  id,
  title: id,
  parentId: null,
  position: 0,
  kind: 'document',
  status: null,
  wordCount: 0,
  ...over,
});

/** Narrow a map entry to its node item (throws for root). */
function nodeItem(map: TreeMap, id: string) {
  const item = map[id]?.item;
  if (!item || item.type !== 'node') throw new Error(`${id} is not a node`);
  return item;
}

describe('buildTreeMap', () => {
  it('returns just the root for an empty outline', () => {
    const map = buildTreeMap([]);
    expect(map.root).toEqual({ item: { type: 'root' }, children: [] });
  });

  it('places root nodes (parentId null) in root.children ordered by position', () => {
    const map = buildTreeMap([
      node('a', { position: 1 }),
      node('b', { position: 0 }),
    ]);
    expect(map.root.children).toEqual(['b', 'a']);
  });

  it('groups children under their parent, ordered by position', () => {
    const map = buildTreeMap([
      node('f', { kind: 'folder' }),
      node('c2', { parentId: 'f', position: 1 }),
      node('c1', { parentId: 'f', position: 0 }),
    ]);
    expect(map['f'].children).toEqual(['c1', 'c2']);
  });

  it('carries the node fields onto the item, with hasChildren=false for a leaf', () => {
    const map = buildTreeMap([
      node('d', {
        title: 'Doc',
        kind: 'document',
        status: 'drafting',
        wordCount: 5,
      }),
    ]);
    expect(nodeItem(map, 'd')).toEqual({
      type: 'node',
      id: 'd',
      title: 'Doc',
      kind: 'document',
      status: 'drafting',
      wordCount: 5,
      hasChildren: false,
    });
    expect(map['d'].children).toEqual([]);
  });

  it('marks a parent as hasChildren', () => {
    const map = buildTreeMap([
      node('f', { kind: 'folder' }),
      node('c', { parentId: 'f' }),
    ]);
    expect(nodeItem(map, 'f').hasChildren).toBe(true);
  });

  it('rolls word counts up the subtree (own + every descendant)', () => {
    const map = buildTreeMap([
      node('f', { kind: 'folder', wordCount: 0 }),
      node('c1', { parentId: 'f', wordCount: 10 }),
      node('c2', { parentId: 'f', wordCount: 5 }),
    ]);
    expect(nodeItem(map, 'f').wordCount).toBe(15);
  });

  it('rolls word counts through multiple levels', () => {
    const map = buildTreeMap([
      node('f', { kind: 'folder', wordCount: 0 }),
      node('sub', { parentId: 'f', kind: 'folder', wordCount: 1 }),
      node('leaf', { parentId: 'sub', wordCount: 4 }),
    ]);
    expect(nodeItem(map, 'leaf').wordCount).toBe(4); // own only
    expect(nodeItem(map, 'sub').wordCount).toBe(5); // 1 + 4
    expect(nodeItem(map, 'f').wordCount).toBe(5); // 0 + 5
  });
});
