import { describe, it, expect } from 'vitest';
import {
  pickCreateScope,
  type NodeForScope,
} from '@web/features/sidebar/lib/pick-create-scope';

const doc = (
  id: string,
  parentId: string | null = null,
  title = id
): NodeForScope => ({ id, parentId, title, kind: 'document' });

const folder = (
  id: string,
  parentId: string | null = null,
  title = id
): NodeForScope => ({ id, parentId, title, kind: 'folder' });

describe('pickCreateScope', () => {
  it('falls back to the root when nothing is open', () => {
    expect(pickCreateScope([folder('f')], undefined)).toEqual({
      parentId: null,
      chapterTitle: null,
    });
  });

  it('falls back to the root for an id that is not in the outline', () => {
    expect(pickCreateScope([folder('f')], 'gone')).toEqual({
      parentId: null,
      chapterTitle: null,
    });
  });

  it('scopes to the open chapter itself', () => {
    const nodes = [folder('f', null, 'Chapter One')];
    expect(pickCreateScope(nodes, 'f')).toEqual({
      parentId: 'f',
      chapterTitle: 'Chapter One',
    });
  });

  it('scopes a document to the chapter holding it', () => {
    const nodes = [folder('f', null, 'Chapter One'), doc('d', 'f')];
    expect(pickCreateScope(nodes, 'd')).toEqual({
      parentId: 'f',
      chapterTitle: 'Chapter One',
    });
  });

  it('climbs past intermediate documents to the nearest chapter', () => {
    const nodes = [
      folder('f', null, 'Chapter One'),
      doc('mid', 'f'),
      doc('leaf', 'mid'),
    ];
    expect(pickCreateScope(nodes, 'leaf')).toEqual({
      parentId: 'f',
      chapterTitle: 'Chapter One',
    });
  });

  it('stops at the nearest chapter, not the outermost one', () => {
    const nodes = [
      folder('outer', null, 'Part One'),
      folder('inner', 'outer', 'Chapter Two'),
      doc('d', 'inner'),
    ];
    expect(pickCreateScope(nodes, 'd')).toEqual({
      parentId: 'inner',
      chapterTitle: 'Chapter Two',
    });
  });

  it('falls back to the root for a document with no chapter above it', () => {
    expect(pickCreateScope([doc('d')], 'd')).toEqual({
      parentId: null,
      chapterTitle: null,
    });
  });

  it('never scopes to a separator', () => {
    const nodes: NodeForScope[] = [
      { id: 's', parentId: null, title: 'PART TWO', kind: 'separator' },
      doc('d', 's'),
    ];
    expect(pickCreateScope(nodes, 'd')).toEqual({
      parentId: null,
      chapterTitle: null,
    });
  });

  it('terminates on a cyclic parent chain', () => {
    const nodes: NodeForScope[] = [
      { id: 'a', parentId: 'b', title: 'a', kind: 'document' },
      { id: 'b', parentId: 'a', title: 'b', kind: 'document' },
    ];
    expect(pickCreateScope(nodes, 'a')).toEqual({
      parentId: null,
      chapterTitle: null,
    });
  });
});
