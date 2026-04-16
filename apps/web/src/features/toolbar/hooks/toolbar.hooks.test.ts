import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { graphql, HttpResponse } from 'msw';
import { useUserPreferences } from '@web/features/toolbar/hooks/toolbar.hooks';
import { useToolbarSettingsSync } from '@web/features/toolbar/hooks/toolbar.hooks';
import { renderHookWithProviders, createStore } from '@web/test/test-utils';
import { tokenAtom, userAtom } from '@web/features/auth/state/auth.store';
import { enabledToolsAtom } from '@web/features/toolbar/state/toolbar.store';
import { server } from '@web/test/mocks/server';
import { MOCK_USER } from '@web/test/mocks/fixtures';
import type { ToolbarToolName } from '@web/features/toolbar/toolbar.types';

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

describe('useToolbarSettingsSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips sync on initial mount', () => {
    const mutationSpy = vi.fn();
    server.use(
      graphql.mutation('UpdateUserToolbar', () => {
        mutationSpy();
        return HttpResponse.json({
          data: {
            updateUserToolbar: {
              user: {
                id: '1',
                enabledTools: ['bold'],
                toolbarType: 'floating',
              },
            },
          },
        });
      })
    );

    renderHookWithProviders(() =>
      useToolbarSettingsSync('user-1', ['bold', 'italic'], false)
    );

    vi.advanceTimersByTime(2000);
    expect(mutationSpy).not.toHaveBeenCalled();
  });

  it('does not sync when isHydrated is false regardless of how many times the effect fires (StrictMode guard)', () => {
    const mutationSpy = vi.fn();
    server.use(
      graphql.mutation('UpdateUserToolbar', () => {
        mutationSpy();
        return HttpResponse.json({
          data: {
            updateUserToolbar: {
              user: { id: '1', enabledTools: ['bold', 'italic'], toolbarType: 'floating' },
            },
          },
        });
      })
    );

    // StrictMode fires effects twice on mount. A ref-based "skip first render" guard
    // fails because refs persist across the simulated unmount/remount, letting the
    // second fire write the atom's default value to the database.
    // isHydrated=false must block the sync no matter how many times the effect runs.
    const { rerender } = renderHookWithProviders(() =>
      useToolbarSettingsSync('user-1', ['bold', 'italic'], false)
    );
    rerender(); // simulate StrictMode second invocation
    rerender(); // extra rerenders should not matter either

    vi.advanceTimersByTime(2000);
    expect(mutationSpy).not.toHaveBeenCalled();
  });

  it('does not sync when userId is null even after rerender', () => {
    const mutationSpy = vi.fn();
    server.use(
      graphql.mutation('UpdateUserToolbar', () => {
        mutationSpy();
        return HttpResponse.json({
          data: {
            updateUserToolbar: {
              user: {
                id: '1',
                enabledTools: ['bold'],
                toolbarType: 'floating',
              },
            },
          },
        });
      })
    );

    // Use a mutable ref to change tools on rerender
    let tools: ToolbarToolName[] = ['bold', 'italic'];
    const { rerender } = renderHookWithProviders(() =>
      useToolbarSettingsSync(null, tools, true)
    );

    // Trigger a rerender with different tools
    tools = ['bold', 'italic', 'underline'];
    rerender();

    vi.advanceTimersByTime(2000);
    expect(mutationSpy).not.toHaveBeenCalled();
  });

  it('syncs after 1s debounce when tools change', async () => {
    vi.useRealTimers();

    const mutationSpy = vi.fn();
    server.use(
      graphql.mutation('UpdateUserToolbar', ({ variables }) => {
        mutationSpy(variables);
        return HttpResponse.json({
          data: {
            updateUserToolbar: {
              user: {
                id: '1',
                enabledTools: variables.enabledTools,
                toolbarType: 'floating',
              },
            },
          },
        });
      })
    );

    let tools: ToolbarToolName[] = ['bold', 'italic'];
    const { rerender } = renderHookWithProviders(() =>
      useToolbarSettingsSync('user-1', tools, true)
    );

    // Simulate tools changing
    tools = ['bold', 'italic', 'underline'];
    rerender();

    // Wait for the debounce + mutation
    await vi.waitFor(
      () => {
        expect(mutationSpy).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    expect(mutationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        enabledTools: ['bold', 'italic', 'underline'],
      })
    );
  });
});
