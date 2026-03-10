import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { graphql, HttpResponse } from 'msw';
import { useToolbarSettingsSync } from './useToolbarSettingsSync';
import { renderHookWithProviders } from '@web/test/test-utils';
import { server } from '@web/test/mocks/server';

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
              user: { id: '1', enabledTools: ['bold'], toolbarType: 'floating' },
            },
          },
        });
      })
    );

    renderHookWithProviders(() =>
      useToolbarSettingsSync('user-1', ['bold', 'italic'])
    );

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
              user: { id: '1', enabledTools: ['bold'], toolbarType: 'floating' },
            },
          },
        });
      })
    );

    // Use a mutable ref to change tools on rerender
    let tools = ['bold', 'italic'];
    const { rerender } = renderHookWithProviders(() =>
      useToolbarSettingsSync(null, tools)
    );

    // Trigger a rerender with different tools (past the initial mount skip)
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

    let tools = ['bold', 'italic'];
    const { rerender } = renderHookWithProviders(() =>
      useToolbarSettingsSync('user-1', tools)
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
