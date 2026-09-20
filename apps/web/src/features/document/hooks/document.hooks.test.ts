import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { useWordCount } from '@web/features/document/hooks/document.hooks';
import { renderHookWithProviders, createStore } from '@web/test/test-utils';
import { tokenAtom } from '@web/features/auth/state/auth.store';
import { server } from '@web/test/mocks/server';
import { MOCK_TOKEN } from '@web/test/mocks/fixtures';

const onRequest = vi.fn();

describe('useWordCount', () => {
  beforeEach(() => {
    onRequest.mockClear();
    server.events.on('request:start', onRequest);
  });

  afterEach(() => {
    server.events.removeListener('request:start', onRequest);
  });

  it('does not fetch documents while logged out', async () => {
    const store = createStore();
    store.set(tokenAtom, null);

    const { result } = renderHookWithProviders(() => useWordCount(), {
      store,
    });

    // Give a fetch every chance to fire before asserting it never did.
    await new Promise((r) => setTimeout(r, 50));
    expect(onRequest).not.toHaveBeenCalled();
    expect(result.current).toBe(0);
  });

  it('fetches documents once logged in', async () => {
    const store = createStore();
    store.set(tokenAtom, MOCK_TOKEN);

    const { result } = renderHookWithProviders(() => useWordCount(), {
      store,
    });

    await waitFor(() => expect(result.current).toBeGreaterThan(0));
  });
});
