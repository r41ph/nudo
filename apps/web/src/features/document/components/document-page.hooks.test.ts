import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useAutoSave } from '@web/features/document/components/document-page.hooks';
import { renderHookWithProviders, createStore } from '@web/test/test-utils';
import { queryClient } from '@web/shared/lib/query-client';
import {
  saveStatusAtom,
  lastSavedAtom,
} from '@web/shared/state/save-status.atom';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // onSuccess writes to the shared singleton cache.
    queryClient.removeQueries({ queryKey: ['document'] });
  });

  it('does not save when documentId is null', async () => {
    const store = createStore();
    const { result } = renderHookWithProviders(() => useAutoSave(null), {
      store,
    });

    await act(async () => {
      result.current.scheduleAutoSave([
        { type: 'p', children: [{ text: 'test' }] },
      ]);
    });

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(store.get(saveStatusAtom)).toBe('unsaved');
  });

  it('scheduleAutoSave does not fire before 2.5s', async () => {
    const store = createStore();
    const { result } = renderHookWithProviders(() => useAutoSave('doc-id'), {
      store,
    });

    await act(async () => {
      result.current.scheduleAutoSave([
        { type: 'p', children: [{ text: 'v1' }] },
      ]);
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(store.get(saveStatusAtom)).toBe('unsaved');
  });

  it('scheduleAutoSave triggers save after 2.5s', async () => {
    vi.useRealTimers();
    const store = createStore();
    const { result } = renderHookWithProviders(() => useAutoSave('doc-id'), {
      store,
    });

    await act(async () => {
      result.current.scheduleAutoSave([
        { type: 'p', children: [{ text: 'v1' }] },
      ]);
    });

    await vi.waitFor(
      () => {
        expect(store.get(saveStatusAtom)).toBe('saved');
      },
      { timeout: 5000 }
    );

    expect(store.get(lastSavedAtom)).toBeInstanceOf(Date);
  });

  it('saveNow fires immediately and resolves', async () => {
    vi.useRealTimers();
    const store = createStore();
    const { result } = renderHookWithProviders(() => useAutoSave('doc-id'), {
      store,
    });

    await act(async () => {
      result.current.scheduleAutoSave([
        { type: 'p', children: [{ text: 'content' }] },
      ]);
      result.current.saveNow();
    });

    await vi.waitFor(() => {
      expect(store.get(saveStatusAtom)).toBe('saved');
    });
    expect(store.get(lastSavedAtom)).toBeInstanceOf(Date);
  });

  it('sets error status on failure', async () => {
    vi.useRealTimers();

    const { server } = await import('@web/test/mocks/server');
    const { graphql, HttpResponse } = await import('msw');

    server.use(
      graphql.mutation('UpdateDocumentContent', () => {
        return HttpResponse.json(
          {
            errors: [{ message: 'Save failed' }],
          },
          { status: 500 }
        );
      })
    );

    const store = createStore();
    const { result } = renderHookWithProviders(() => useAutoSave('doc-id'), {
      store,
    });

    await act(async () => {
      result.current.scheduleAutoSave([
        { type: 'p', children: [{ text: 'data' }] },
      ]);
      result.current.saveNow();
    });

    await vi.waitFor(() => {
      expect(store.get(saveStatusAtom)).toBe('error');
    });
  });

  // Regression: without the cache write-through, navigating away and back
  // within staleTime re-seeded the editor with pre-edit content.
  it('writes saved content through to the document query cache', async () => {
    vi.useRealTimers();

    const { server } = await import('@web/test/mocks/server');
    const { graphql, HttpResponse } = await import('msw');

    const docId = '11111111-2222-3333-4444-555566667777';
    const newContent = [{ type: 'p', children: [{ text: 'edited body' }] }];

    server.use(
      graphql.mutation('UpdateDocumentContent', ({ variables }) =>
        HttpResponse.json({
          data: {
            updateDocumentContent: {
              document: {
                id: variables.docId,
                content: variables.newContent,
                plainText: 'edited body',
                wordCount: 2,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        })
      )
    );

    queryClient.setQueryData(['document', docId], {
      documentById: {
        id: docId,
        title: 'Test Document',
        content: [{ type: 'p', children: [{ text: 'stale body' }] }],
        plainText: 'stale body',
        wordCount: 2,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    });

    const store = createStore();
    const { result } = renderHookWithProviders(() => useAutoSave(docId), {
      store,
    });

    await act(async () => {
      result.current.scheduleAutoSave(newContent);
      result.current.saveNow();
    });

    await vi.waitFor(() => {
      expect(store.get(saveStatusAtom)).toBe('saved');
    });

    const cached = queryClient.getQueryData<{
      documentById: { content: unknown[] };
    }>(['document', docId]);
    expect(cached?.documentById.content).toEqual(newContent);
  });
});
