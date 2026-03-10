import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import { enabledToolsAtom } from './toolbar.atom';

describe('enabledToolsAtom', () => {
  it('defaults to bold and italic', () => {
    const store = createStore();
    expect(store.get(enabledToolsAtom)).toEqual(['bold', 'italic']);
  });

  it('can be updated with new tools', () => {
    const store = createStore();
    store.set(enabledToolsAtom, ['bold', 'italic', 'underline', 'code']);
    expect(store.get(enabledToolsAtom)).toEqual([
      'bold',
      'italic',
      'underline',
      'code',
    ]);
  });
});
