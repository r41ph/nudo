import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import { enabledToolsAtom } from '@web/features/toolbar/state/toolbar.store';

describe('enabledToolsAtom', () => {
  it('defaults to bold and italic', () => {
    const store = createStore();
    expect(store.get(enabledToolsAtom)).toEqual(['bold', 'italic']);
  });

  it('can be updated with new tools', () => {
    const store = createStore();
    store.set(enabledToolsAtom, ['bold', 'italic', 'underline', 'codeBlock']);
    expect(store.get(enabledToolsAtom)).toEqual([
      'bold',
      'italic',
      'underline',
      'codeBlock',
    ]);
  });
});
