import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import { dialogAtom } from './dialog.atom';

describe('dialogAtom', () => {
  it('defaults to no active dialog', () => {
    const store = createStore();
    expect(store.get(dialogAtom)).toEqual({ activeDialog: null });
  });

  it('can set an active dialog', () => {
    const store = createStore();
    store.set(dialogAtom, { activeDialog: 'editor-toolbar' });
    expect(store.get(dialogAtom)).toEqual({ activeDialog: 'editor-toolbar' });
  });

  it('can clear the active dialog', () => {
    const store = createStore();
    store.set(dialogAtom, { activeDialog: 'editor-toolbar' });
    store.set(dialogAtom, { activeDialog: null });
    expect(store.get(dialogAtom)).toEqual({ activeDialog: null });
  });
});
