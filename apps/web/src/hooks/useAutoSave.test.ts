import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';
import {
  renderHookWithProviders,
  createStore,
} from '@web/test/test-utils';
import { saveStatusAtom, lastSavedAtom } from '@web/state/save-status.atom';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

    expect(store.get(saveStatusAtom)).toBe('idle');
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

    // After 1 second, should still be idle
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(store.get(saveStatusAtom)).toBe('idle');
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

    // Wait for debounce + mutation to complete
    await vi.waitFor(() => {
      expect(store.get(saveStatusAtom)).toBe('saved');
    }, { timeout: 5000 });

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

    // Import server and override to fail
    const { server } = await import('@web/test/mocks/server');
    const { graphql, HttpResponse } = await import('msw');

    server.use(
      graphql.mutation('UpdateDocumentContent', () => {
        return HttpResponse.json({
          errors: [{ message: 'Save failed' }],
        }, { status: 500 });
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
});
