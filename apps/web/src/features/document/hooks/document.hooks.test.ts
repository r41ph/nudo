import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { useWordCount } from '@web/features/document/hooks/document.hooks';
import { renderHookWithProviders, createStore } from '@web/test/test-utils';
import { tokenAtom } from '@web/features/auth/state/auth.store';
import { graphql, HttpResponse } from 'msw';
import { server } from '@web/test/mocks/server';
import { MOCK_PROJECT, MOCK_TOKEN } from '@web/test/mocks/fixtures';

const inProject = {
  initialRoute: `/project/${MOCK_PROJECT.id}`,
  routePath: '/project/:projectId',
};

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
      ...inProject,
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
      ...inProject,
    });

    await waitFor(() => expect(result.current).toBeGreaterThan(0));
  });

  it("totals only the active project's documents", async () => {
    const store = createStore();
    store.set(tokenAtom, MOCK_TOKEN);
    const variables = vi.fn();
    server.use(
      graphql.query('GetDocuments', ({ variables: vars }) => {
        variables(vars);
        return HttpResponse.json({ data: { allDocuments: { nodes: [] } } });
      })
    );

    const { result } = renderHookWithProviders(() => useWordCount(), {
      store,
      initialRoute: '/project/another-project',
      routePath: '/project/:projectId',
    });

    await waitFor(() =>
      expect(variables).toHaveBeenCalledWith({ projectId: 'another-project' })
    );
    expect(result.current).toBe(0);
  });
});
