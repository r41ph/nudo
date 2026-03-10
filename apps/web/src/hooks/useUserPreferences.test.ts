import { describe, it, expect, vi } from 'vitest';
import { useUserPreferences } from './useUserPreferences';
import { renderHookWithProviders, createStore } from '@web/test/test-utils';
import { tokenAtom, userAtom } from '@web/state/auth.atom';
import { enabledToolsAtom } from '@web/state/toolbar.atom';
import { MOCK_USER } from '@web/test/mocks/fixtures';

describe('useUserPreferences', () => {
  it('does not fetch when not authenticated', () => {
    const store = createStore();
    const { result } = renderHookWithProviders(() => useUserPreferences(), {
      store,
    });
    // Should not be loading since the query is disabled
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches and sets enabledTools when authenticated', async () => {
    const store = createStore();
    store.set(tokenAtom, 'fake-token');
    store.set(userAtom, MOCK_USER);

    renderHookWithProviders(() => useUserPreferences(), { store });

    // Wait for the query to resolve and the effect to run
    await vi.waitFor(() => {
      const tools = store.get(enabledToolsAtom);
      expect(tools).toEqual(['bold', 'italic', 'underline']);
    });
  });

  it('returns isLoading true while fetching', () => {
    const store = createStore();
    store.set(tokenAtom, 'fake-token');
    store.set(userAtom, MOCK_USER);

    const { result } = renderHookWithProviders(() => useUserPreferences(), {
      store,
    });

    // On first render, isLoading should be true
    expect(result.current.isLoading).toBe(true);
  });
});
