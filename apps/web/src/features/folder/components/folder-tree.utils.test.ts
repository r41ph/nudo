import { describe, it, expect } from 'vitest';
import { buildTreeMap } from '@web/features/folder/components/folder-tree';
import type { TreeFolderItem, TreeLeafItem } from '@web/features/folder/components/folder-tree.types';

describe('buildTreeMap', () => {
  it('builds a tree with only root when given empty inputs', () => {
    const map = buildTreeMap([], []);
    expect(map['root']).toBeDefined();
    expect(map['root'].item).toEqual({ type: 'root' });
    expect(map['root'].children).toEqual([]);
  });

  it('places root docs in the root children list', () => {
    const rootItems: TreeLeafItem[] = [{ id: 'd1', title: 'Doc 1', position: 0 }];
    const map = buildTreeMap([], rootItems);
    expect(map['root'].children).toEqual(['doc-d1']);
  });

  it('places folders in the root children list', () => {
    const folders: TreeFolderItem[] = [
      { id: 'f1', name: 'Folder 1', position: 0, items: [] },
    ];
    const map = buildTreeMap(folders, []);
    expect(map['root'].children).toEqual(['folder-f1']);
  });

  it('interleaves folders and root docs sorted by position', () => {
    const folders: TreeFolderItem[] = [
      { id: 'f1', name: 'A', position: 1, items: [] },
      { id: 'f2', name: 'B', position: 3, items: [] },
    ];
    const rootItems: TreeLeafItem[] = [
      { id: 'd1', title: 'Doc 1', position: 0 },
      { id: 'd2', title: 'Doc 2', position: 2 },
    ];
    const map = buildTreeMap(folders, rootItems);
    expect(map['root'].children).toEqual(['doc-d1', 'folder-f1', 'doc-d2', 'folder-f2']);
  });

  it('correctly reflects global positions used by onDrop', () => {
    // Simulates the state after a root-level reorder where positions
    // are assigned as global indices (0,1,2,3) across folders and docs.
    const folders: TreeFolderItem[] = [
      { id: 'f1', name: 'F1', position: 0, items: [] },
      { id: 'f2', name: 'F2', position: 2, items: [] },
    ];
    const rootItems: TreeLeafItem[] = [
      { id: 'd1', title: 'D1', position: 1 },
      { id: 'd2', title: 'D2', position: 3 },
    ];
    const map = buildTreeMap(folders, rootItems);
    expect(map['root'].children).toEqual(['folder-f1', 'doc-d1', 'folder-f2', 'doc-d2']);
  });

  it('places folder children as doc-* ids in order', () => {
    const folders: TreeFolderItem[] = [
      {
        id: 'f1',
        name: 'Folder 1',
        position: 0,
        items: [
          { id: 'd1', title: 'Doc 1' },
          { id: 'd2', title: 'Doc 2' },
        ],
      },
    ];
    const map = buildTreeMap(folders, []);
    expect(map['folder-f1'].children).toEqual(['doc-d1', 'doc-d2']);
  });

  it('builds correct item data for folders', () => {
    const folders: TreeFolderItem[] = [
      { id: 'f1', name: 'My Folder', position: 0, items: [] },
    ];
    const map = buildTreeMap(folders, []);
    expect(map['folder-f1'].item).toEqual({ type: 'folder', domainId: 'f1', name: 'My Folder' });
  });

  it('builds correct item data for root documents', () => {
    const rootItems: TreeLeafItem[] = [{ id: 'd1', title: 'My Doc', position: 0 }];
    const map = buildTreeMap([], rootItems);
    expect(map['doc-d1'].item).toEqual({ type: 'document', domainId: 'd1', title: 'My Doc' });
    expect(map['doc-d1'].children).toEqual([]);
  });

  it('builds correct item data for folder documents', () => {
    const folders: TreeFolderItem[] = [
      { id: 'f1', name: 'Folder', position: 0, items: [{ id: 'd1', title: 'Nested' }] },
    ];
    const map = buildTreeMap(folders, []);
    expect(map['doc-d1'].item).toEqual({ type: 'document', domainId: 'd1', title: 'Nested' });
    expect(map['doc-d1'].children).toEqual([]);
  });

  it('root doc without a position gets a stable fallback index', () => {
    const rootItems: TreeLeafItem[] = [
      { id: 'd1', title: 'A' },
      { id: 'd2', title: 'B' },
    ];
    const map = buildTreeMap([], rootItems);
    const children = map['root'].children;
    expect(children).toContain('doc-d1');
    expect(children).toContain('doc-d2');
    expect(children.indexOf('doc-d1')).toBeLessThan(children.indexOf('doc-d2'));
  });

  it('root doc overrides folder with lower position', () => {
    // doc at position 0 should appear before folder at position 1
    const folders: TreeFolderItem[] = [{ id: 'f1', name: 'F', position: 1, items: [] }];
    const rootItems: TreeLeafItem[] = [{ id: 'd1', title: 'D', position: 0 }];
    const map = buildTreeMap(folders, rootItems);
    expect(map['root'].children).toEqual(['doc-d1', 'folder-f1']);
  });
});
