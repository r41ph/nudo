import { describe, it, expect } from 'vitest';
import {
  pickAdjacentDocumentId,
  pickDocumentAfterFolderDeletion,
  type DocumentForAdjacency,
} from '@web/features/sidebar/lib/pick-adjacent-document';

const doc = (
  id: string,
  position: number,
  folderId: string | null = null
): DocumentForAdjacency => ({ id, position, folderId });

describe('pickAdjacentDocumentId', () => {
  it('returns the next sibling in the same container', () => {
    const docs = [doc('a', 0), doc('b', 1), doc('c', 2)];
    expect(pickAdjacentDocumentId(docs, 'b')).toBe('c');
  });

  it('returns the previous sibling when the deleted one was last', () => {
    const docs = [doc('a', 0), doc('b', 1), doc('c', 2)];
    expect(pickAdjacentDocumentId(docs, 'c')).toBe('b');
  });

  it('stays within the same folder rather than crossing into root', () => {
    const docs = [
      doc('root-1', 0),
      doc('f-1', 0, 'folder'),
      doc('f-2', 1, 'folder'),
    ];
    expect(pickAdjacentDocumentId(docs, 'f-1')).toBe('f-2');
  });

  it('falls back to a root document when the folder is emptied', () => {
    const docs = [doc('root-1', 0), doc('only-in-folder', 0, 'folder')];
    expect(pickAdjacentDocumentId(docs, 'only-in-folder')).toBe('root-1');
  });

  it('falls back to a remaining folder document when no root docs exist', () => {
    const docs = [
      doc('only-in-a', 0, 'folder-a'),
      doc('only-in-b', 0, 'folder-b'),
    ];
    expect(pickAdjacentDocumentId(docs, 'only-in-a')).toBe('only-in-b');
  });

  it('returns null when the deleted document was the only one', () => {
    expect(pickAdjacentDocumentId([doc('a', 0)], 'a')).toBeNull();
  });

  it('orders by position, not array order', () => {
    const docs = [doc('a', 2), doc('b', 0), doc('c', 1)];
    // Deleting 'b' (position 0) → next by position is 'c' (position 1).
    expect(pickAdjacentDocumentId(docs, 'b')).toBe('c');
  });

  it('returns a remaining document when the deleted id is unknown', () => {
    const docs = [doc('a', 0), doc('b', 1)];
    expect(pickAdjacentDocumentId(docs, 'missing')).toBe('a');
  });
});

describe('pickDocumentAfterFolderDeletion', () => {
  it('returns a remaining root document, preferring the first by position', () => {
    const docs = [
      doc('in-folder', 0, 'folder'),
      doc('root-2', 1),
      doc('root-1', 0),
    ];
    expect(pickDocumentAfterFolderDeletion(docs, ['in-folder'])).toBe('root-1');
  });

  it('excludes every document in the deleted folder', () => {
    const docs = [
      doc('f-1', 0, 'folder'),
      doc('f-2', 1, 'folder'),
      doc('root-1', 0),
    ];
    expect(pickDocumentAfterFolderDeletion(docs, ['f-1', 'f-2'])).toBe(
      'root-1'
    );
  });

  it('falls back to a document in another folder when no root docs remain', () => {
    const docs = [doc('f-a', 0, 'folder-a'), doc('f-b', 0, 'folder-b')];
    expect(pickDocumentAfterFolderDeletion(docs, ['f-a'])).toBe('f-b');
  });

  it('returns null when the folder held every document', () => {
    const docs = [doc('f-1', 0, 'folder'), doc('f-2', 1, 'folder')];
    expect(pickDocumentAfterFolderDeletion(docs, ['f-1', 'f-2'])).toBeNull();
  });
});
