import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import { tokenAtom, userAtom, isAuthenticatedAtom } from './auth.atom';

describe('auth atoms', () => {
  it('isAuthenticatedAtom returns false when tokenAtom is null', () => {
    const store = createStore();
    store.set(tokenAtom, null);
    expect(store.get(isAuthenticatedAtom)).toBe(false);
  });

  it('isAuthenticatedAtom returns true when tokenAtom has a value', () => {
    const store = createStore();
    store.set(tokenAtom, 'some-token');
    expect(store.get(isAuthenticatedAtom)).toBe(true);
  });

  it('userAtom defaults to null when localStorage is empty', () => {
    const store = createStore();
    expect(store.get(userAtom)).toBeNull();
  });

  it('tokenAtom defaults to null when localStorage is empty', () => {
    const store = createStore();
    expect(store.get(tokenAtom)).toBeNull();
  });
});
