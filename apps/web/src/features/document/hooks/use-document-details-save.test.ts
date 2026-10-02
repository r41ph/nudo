import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { useDocumentDetailsSave } from '@web/features/document/hooks/use-document-details-save';
import type { DocumentDetails } from '@web/features/document/document.types';
import { queryClient } from '@web/shared/lib/query-client';
import { server } from '@web/test/mocks/server';
import { renderHookWithProviders } from '@web/test/test-utils';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const DETAILS: DocumentDetails = {
  id: 'd1',
  title: 'The Arrival',
  kind: 'document',
  status: null,
  summary: '',
  pov: '',
  createdAt: '2026-09-01T09:00:00Z',
  updatedAt: '2026-09-01T09:00:00Z',
};

const SAVED_AT = '2026-10-01T12:00:00Z';

type Patch = Record<string, unknown>;

// Records every patch the hook sends. `failures` makes the first N fail.
function captureSaves(failures = 0) {
  const patches: Patch[] = [];
  server.use(
    graphql.mutation('UpdateDocumentDetails', ({ variables }) => {
      patches.push(variables.patch as Patch);
      if (patches.length <= failures) {
        return HttpResponse.json(
          { errors: [{ message: 'Save failed' }] },
          { status: 500 }
        );
      }
      return HttpResponse.json({
        data: {
          updateDocumentById: {
            document: {
              ...DETAILS,
              ...(variables.patch as Patch),
              updatedAt: SAVED_AT,
            },
          },
        },
      });
    })
  );
  return patches;
}

function setup(details: DocumentDetails = DETAILS) {
  return renderHookWithProviders(() => useDocumentDetailsSave(details));
}

// Lets MSW's response and the hook's state updates land.
const settle = () => act(() => vi.advanceTimersByTimeAsync(50));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.mocked(toast.error).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  // Successful saves write to the shared singleton cache.
  queryClient.removeQueries({ queryKey: ['document'] });
});

describe('useDocumentDetailsSave — title', () => {
  it('saves the trimmed title on commit', async () => {
    const patches = captureSaves();
    const { result } = setup();

    act(() => result.current.setTitle('Dinner  '));
    act(() => result.current.commitTitle());
    await settle();

    expect(patches).toEqual([{ title: 'Dinner' }]);
    expect(result.current.title).toBe('Dinner');
  });

  it('sends nothing when the title did not change', async () => {
    const patches = captureSaves();
    const { result } = setup();

    act(() => result.current.setTitle('The Arrival '));
    act(() => result.current.commitTitle());
    await settle();

    expect(patches).toEqual([]);
    expect(result.current.title).toBe('The Arrival');
  });

  it('restores the previous title instead of saving an empty one', async () => {
    const patches = captureSaves();
    const { result } = setup();

    act(() => result.current.setTitle('   '));
    act(() => result.current.commitTitle());
    await settle();

    expect(patches).toEqual([]);
    expect(result.current.title).toBe('The Arrival');
  });
});

describe('useDocumentDetailsSave — status', () => {
  it('saves a status change immediately', async () => {
    const patches = captureSaves();
    const { result } = setup();

    act(() => result.current.setStatus('drafting'));
    await settle();

    expect(patches).toEqual([{ status: 'drafting' }]);
    expect(result.current.status).toBe('drafting');
  });
});

// The outline row menu can rename or set status while the panel is open.
describe('useDocumentDetailsSave — server changes', () => {
  function setupWithProps() {
    let details = DETAILS;
    const hook = renderHookWithProviders(() => useDocumentDetailsSave(details));
    const receive = (next: Partial<DocumentDetails>) => {
      details = { ...details, ...next };
      hook.rerender();
    };
    return { ...hook, receive };
  }

  it('takes a new server title when the field has no unsaved edits', () => {
    const { result, receive } = setupWithProps();

    receive({ title: 'Renamed' });

    expect(result.current.title).toBe('Renamed');
  });

  it('keeps a title being edited', () => {
    const { result, receive } = setupWithProps();

    act(() => result.current.setTitle('Half typed'));
    receive({ title: 'Renamed' });

    expect(result.current.title).toBe('Half typed');
  });

  it('restores the server title, not the original, when emptied after a rename', () => {
    const { result, receive } = setupWithProps();

    receive({ title: 'Renamed' });
    act(() => result.current.setTitle('  '));
    act(() => result.current.commitTitle());

    expect(result.current.title).toBe('Renamed');
  });

  it('takes a new server status', () => {
    const { result, receive } = setupWithProps();

    receive({ status: 'done' });

    expect(result.current.status).toBe('done');
  });

  it('keeps a newer status when an earlier save lands', async () => {
    captureSaves();
    const { result, receive } = setupWithProps();

    act(() => result.current.setStatus('drafting'));
    act(() => result.current.setStatus('done'));
    receive({ status: 'drafting' });

    expect(result.current.status).toBe('done');
    await settle();
  });
});

describe('useDocumentDetailsSave — summary and pov', () => {
  it('waits for a 1s pause, then sends only the final text', async () => {
    const patches = captureSaves();
    const { result } = setup();

    act(() => result.current.setSummary('M'));
    act(() => result.current.setSummary('Ma'));
    act(() => result.current.setSummary('Mara arrives.'));
    await act(() => vi.advanceTimersByTimeAsync(900));
    expect(patches).toEqual([]);

    await act(() => vi.advanceTimersByTimeAsync(100));
    await settle();

    expect(patches).toEqual([{ summary: 'Mara arrives.' }]);
  });

  it('combines summary and pov typed in the same pause into one patch', async () => {
    const patches = captureSaves();
    const { result } = setup();

    act(() => result.current.setSummary('Mara arrives.'));
    act(() => result.current.setPov('Mara'));
    await act(() => vi.advanceTimersByTimeAsync(1000));
    await settle();

    expect(patches).toEqual([{ summary: 'Mara arrives.', pov: 'Mara' }]);
  });

  // An immediate save shouldn't leave typed text waiting on a timer that
  // a close or switch could cut short.
  it('carries pending text along with an immediate save', async () => {
    const patches = captureSaves();
    const { result } = setup();

    act(() => result.current.setSummary('Mara arrives.'));
    act(() => result.current.setStatus('done'));
    await settle();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    await settle();

    expect(patches).toEqual([{ summary: 'Mara arrives.', status: 'done' }]);
  });
});

describe('useDocumentDetailsSave — flushing', () => {
  it('sends pending text straight away on flush', async () => {
    const patches = captureSaves();
    const { result } = setup();

    act(() => result.current.setPov('Mara'));
    act(() => result.current.flush());
    await settle();

    expect(patches).toEqual([{ pov: 'Mara' }]);
  });

  it('sends pending text when the panel unmounts', async () => {
    const patches = captureSaves();
    const { result, unmount } = setup();

    act(() => result.current.setSummary('Half a thought'));
    unmount();
    await settle();

    expect(patches).toEqual([{ summary: 'Half a thought' }]);
  });

  // The toast is global, so the writer still hears about it with the panel gone.
  it('still reports a failed send after the panel unmounts', async () => {
    captureSaves(1);
    const { result, unmount } = setup();

    act(() => result.current.setSummary('Half a thought'));
    unmount();
    await settle();

    expect(toast.error).toHaveBeenCalledWith(
      'Could not save details — try again.',
      { id: 'inspector-save-error' }
    );
  });

  it('sends pending text when the page is hidden', async () => {
    const patches = captureSaves();
    const { result } = setup();

    act(() => result.current.setSummary('Closing the tab'));
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await settle();

    expect(patches).toEqual([{ summary: 'Closing the tab' }]);
  });

  it('sends nothing on unmount when nothing is pending', async () => {
    const patches = captureSaves();
    const { unmount } = setup();

    unmount();
    await settle();

    expect(patches).toEqual([]);
  });
});

describe('useDocumentDetailsSave — outcome', () => {
  it('reports saving, then saved', async () => {
    captureSaves();
    const { result } = setup();
    expect(result.current.saveState).toBe('idle');

    act(() => result.current.setStatus('planned'));
    expect(result.current.saveState).toBe('saving');

    await settle();
    expect(result.current.saveState).toBe('saved');
  });

  it('merges the saved fields into the document cache, leaving content alone', async () => {
    captureSaves();
    const content = [{ type: 'p', children: [{ text: 'prose' }] }];
    queryClient.setQueryData(['document', 'd1'], {
      documentById: { ...DETAILS, content, wordCount: 1 },
    });
    const { result } = setup();

    act(() => result.current.setStatus('drafting'));
    await settle();

    expect(queryClient.getQueryData(['document', 'd1'])).toEqual({
      documentById: {
        ...DETAILS,
        content,
        wordCount: 1,
        status: 'drafting',
        updatedAt: SAVED_AT,
      },
    });
  });

  it('keeps the typed text and says so when a save fails', async () => {
    captureSaves(1);
    const { result } = setup();

    act(() => result.current.setSummary('Do not lose me'));
    act(() => result.current.flush());
    await settle();

    expect(result.current.saveState).toBe('error');
    expect(result.current.summary).toBe('Do not lose me');
    expect(toast.error).toHaveBeenCalledWith(
      'Could not save details — try again.',
      { id: 'inspector-save-error' }
    );
  });

  it('retries with the same patch', async () => {
    const patches = captureSaves(1);
    const { result } = setup();
    act(() => result.current.setSummary('Second time lucky'));
    act(() => result.current.flush());
    await settle();

    act(() => result.current.retry());
    await settle();

    expect(patches).toEqual([
      { summary: 'Second time lucky' },
      { summary: 'Second time lucky' },
    ]);
    expect(result.current.saveState).toBe('saved');
  });
});

describe('useDocumentDetailsSave — overlapping saves', () => {
  // Two quick saves on separate connections can be processed out of order;
  // the stale one landing last would overwrite the newer text.
  it('applies saves on the server in the order they were made', async () => {
    const applied: Patch[] = [];
    let calls = 0;
    server.use(
      graphql.mutation('UpdateDocumentDetails', async ({ variables }) => {
        calls += 1;
        if (calls === 1) await new Promise((r) => setTimeout(r, 300));
        applied.push(variables.patch as Patch);
        return HttpResponse.json({
          data: {
            updateDocumentById: {
              document: { ...DETAILS, ...(variables.patch as Patch) },
            },
          },
        });
      })
    );
    const { result } = setup();

    act(() => result.current.setStatus('planned'));
    act(() => result.current.setStatus('drafting'));
    await act(() => vi.advanceTimersByTimeAsync(400));
    await settle();

    expect(applied).toEqual([{ status: 'planned' }, { status: 'drafting' }]);
  });

  it('keeps saying saving until the newest save lands', async () => {
    let release: () => void = () => {};
    let calls = 0;
    server.use(
      graphql.mutation('UpdateDocumentDetails', async ({ variables }) => {
        calls += 1;
        if (calls === 2) await new Promise<void>((r) => (release = r));
        return HttpResponse.json({
          data: {
            updateDocumentById: {
              document: { ...DETAILS, ...(variables.patch as Patch) },
            },
          },
        });
      })
    );
    const { result } = setup();

    act(() => result.current.setStatus('planned'));
    act(() => result.current.setStatus('drafting'));
    await settle();
    expect(result.current.saveState).toBe('saving');

    release();
    await settle();
    expect(result.current.saveState).toBe('saved');
  });
});
