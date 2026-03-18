import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import { saveStatusAtom, lastSavedAtom, type SaveStatus } from './save-status.atom';

describe('saveStatusAtom', () => {
  it('defaults to idle', () => {
    const store = createStore();
    expect(store.get(saveStatusAtom)).toBe('idle');
  });

  it('each store instance has its own independent state', () => {
    const store1 = createStore();
    const store2 = createStore();
    store1.set(saveStatusAtom, 'saving');
    expect(store2.get(saveStatusAtom)).toBe('idle');
  });

  it.each<SaveStatus>(['saving', 'saved', 'error', 'idle'])(
    'accepts status "%s"',
    (status) => {
      const store = createStore();
      store.set(saveStatusAtom, status);
      expect(store.get(saveStatusAtom)).toBe(status);
    }
  );

  it('reflects a full save lifecycle: idle → saving → saved', () => {
    const store = createStore();
    expect(store.get(saveStatusAtom)).toBe('idle');
    store.set(saveStatusAtom, 'saving');
    expect(store.get(saveStatusAtom)).toBe('saving');
    store.set(saveStatusAtom, 'saved');
    expect(store.get(saveStatusAtom)).toBe('saved');
  });

  it('transitions to error on save failure', () => {
    const store = createStore();
    store.set(saveStatusAtom, 'saving');
    store.set(saveStatusAtom, 'error');
    expect(store.get(saveStatusAtom)).toBe('error');
  });
});

describe('lastSavedAtom', () => {
  it('defaults to null', () => {
    const store = createStore();
    expect(store.get(lastSavedAtom)).toBeNull();
  });

  it('stores a Date value', () => {
    const store = createStore();
    const date = new Date('2026-03-17T10:00:00Z');
    store.set(lastSavedAtom, date);
    expect(store.get(lastSavedAtom)).toEqual(date);
  });

  it('can be updated to a later timestamp', () => {
    const store = createStore();
    const first = new Date('2026-03-17T10:00:00Z');
    const second = new Date('2026-03-17T10:05:00Z');
    store.set(lastSavedAtom, first);
    store.set(lastSavedAtom, second);
    expect(store.get(lastSavedAtom)).toEqual(second);
  });

  it('can be reset to null', () => {
    const store = createStore();
    store.set(lastSavedAtom, new Date());
    store.set(lastSavedAtom, null);
    expect(store.get(lastSavedAtom)).toBeNull();
  });
});
