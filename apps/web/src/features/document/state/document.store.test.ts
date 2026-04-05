import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import { currentDocumentAtom } from '@web/features/document/state/document.store';
import type { DocumentData } from '@web/features/document/types';

const makeDoc = (overrides: Partial<DocumentData> = {}): DocumentData => ({
  id: 'doc-1',
  title: 'My Doc',
  slug: 'my-doc',
  content: [],
  wordCount: 0,
  ...overrides,
});

describe('currentDocumentAtom', () => {
  it('defaults to null', () => {
    const store = createStore();
    expect(store.get(currentDocumentAtom)).toBeNull();
  });

  it('stores a document', () => {
    const store = createStore();
    const doc = makeDoc();
    store.set(currentDocumentAtom, doc);
    expect(store.get(currentDocumentAtom)).toEqual(doc);
  });

  it('can be updated to a different document', () => {
    const store = createStore();
    store.set(currentDocumentAtom, makeDoc({ id: 'doc-1' }));
    store.set(currentDocumentAtom, makeDoc({ id: 'doc-2', title: 'Other' }));
    expect(store.get(currentDocumentAtom)?.id).toBe('doc-2');
  });

  it('can be cleared back to null', () => {
    const store = createStore();
    store.set(currentDocumentAtom, makeDoc());
    store.set(currentDocumentAtom, null);
    expect(store.get(currentDocumentAtom)).toBeNull();
  });

  it('stores arbitrary content arrays', () => {
    const store = createStore();
    const content = [{ type: 'p', children: [{ text: 'hi' }] }];
    store.set(currentDocumentAtom, makeDoc({ content }));
    expect(store.get(currentDocumentAtom)?.content).toEqual(content);
  });
});
