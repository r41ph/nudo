import { describe, it, expect } from 'vitest';
import {
  pickAdjacentDocumentId,
  pickDocumentAfterContainerDeletion,
  type DocumentForAdjacency,
} from '@web/features/sidebar/lib/pick-adjacent-document';

const doc = (
  id: string,
  position: number,
  parentId: string | null = null
): DocumentForAdjacency => ({ id, position, parentId });

describe('pickAdjacentDocumentId', () => {
  it('returns the next sibling under the same parent', () => {
    const docs = [doc('a', 0), doc('b', 1), doc('c', 2)];
    expect(pickAdjacentDocumentId(docs, 'b')).toBe('c');
  });

  it('returns the previous sibling when the deleted one was last', () => {
    const docs = [doc('a', 0), doc('b', 1), doc('c', 2)];
    expect(pickAdjacentDocumentId(docs, 'c')).toBe('b');
  });

  it('stays within the same parent rather than crossing into root', () => {
    const docs = [doc('root-1', 0), doc('f-1', 0, 'p'), doc('f-2', 1, 'p')];
    expect(pickAdjacentDocumentId(docs, 'f-1')).toBe('f-2');
  });

  it('falls back to a remaining node when the sibling group is emptied', () => {
    const docs = [doc('root-1', 0), doc('only-child', 0, 'p')];
    expect(pickAdjacentDocumentId(docs, 'only-child')).toBe('root-1');
  });

  it('falls back to a node under another parent when no root nodes exist', () => {
    const docs = [doc('only-in-a', 0, 'a'), doc('only-in-b', 0, 'b')];
    expect(pickAdjacentDocumentId(docs, 'only-in-a')).toBe('only-in-b');
  });

  it('returns null when the deleted node was the only one', () => {
    expect(pickAdjacentDocumentId([doc('a', 0)], 'a')).toBeNull();
  });

  it('orders by position, not array order', () => {
    const docs = [doc('a', 2), doc('b', 0), doc('c', 1)];
    expect(pickAdjacentDocumentId(docs, 'b')).toBe('c');
  });

  it('returns a remaining node when the deleted id is unknown', () => {
    const docs = [doc('a', 0), doc('b', 1)];
    expect(pickAdjacentDocumentId(docs, 'missing')).toBe('a');
  });
});

describe('pickDocumentAfterContainerDeletion', () => {
  it('returns a remaining node, preferring the first by position', () => {
    const docs = [doc('in-sub', 0, 'p'), doc('root-2', 1), doc('root-1', 0)];
    expect(pickDocumentAfterContainerDeletion(docs, ['in-sub'])).toBe('root-1');
  });

  it('excludes every node in the deleted subtree', () => {
    const docs = [doc('f-1', 0, 'p'), doc('f-2', 1, 'p'), doc('root-1', 0)];
    expect(pickDocumentAfterContainerDeletion(docs, ['f-1', 'f-2'])).toBe(
      'root-1'
    );
  });

  it('falls back to a node under another parent when no root nodes remain', () => {
    const docs = [doc('f-a', 0, 'a'), doc('f-b', 0, 'b')];
    expect(pickDocumentAfterContainerDeletion(docs, ['f-a'])).toBe('f-b');
  });

  it('returns null when the subtree held every node', () => {
    const docs = [doc('f-1', 0, 'p'), doc('f-2', 1, 'p')];
    expect(pickDocumentAfterContainerDeletion(docs, ['f-1', 'f-2'])).toBeNull();
  });
});
