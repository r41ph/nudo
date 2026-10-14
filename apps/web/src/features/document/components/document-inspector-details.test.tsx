import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactElement } from 'react';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { graphql, HttpResponse } from 'msw';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GET_DOCUMENT } from '@web/features/document/api/document.api';
import { DocumentInspector } from '@web/features/document/components/document-inspector';
import type { DocumentDetails } from '@web/features/document/document.types';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { queryClient } from '@web/shared/lib/query-client';
import {
  inspectorAtom,
  inspectorFocusRequestedAtom,
  openInspectorAtom,
} from '@web/shared/state/panels.atom';
import { server } from '@web/test/mocks/server';
import { renderWithProviders, createStore } from '@web/test/test-utils';
import { MOCK_PROJECT } from '@web/test/mocks/fixtures';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const DOC: DocumentDetails = {
  id: 'd1',
  title: 'The Arrival',
  kind: 'document',
  status: 'drafting',
  summary: 'Mara arrives in Lisbon.',
  pov: 'Mara',
  createdAt: '2025-09-12T10:24:00Z',
  updatedAt: '2025-09-15T14:03:00Z',
};

const SAVED_AT = '2025-09-16T08:30:00Z';

type Patch = Record<string, unknown>;

// Saves answer with a fresh updatedAt and add their POV to the outline, as
// the server would, so the panel's refetches see the change.
function captureSaves({
  failures = 0,
  povs = ['Mara', 'Teo', 'Mara', ''],
}: { failures?: number; povs?: string[] } = {}) {
  const patches: Patch[] = [];
  const outlinePovs = [...povs];
  server.use(
    graphql.mutation('UpdateDocumentDetails', ({ variables }) => {
      const patch = variables.patch as Patch;
      patches.push(patch);
      if (patches.length <= failures) {
        return HttpResponse.json(
          { errors: [{ message: 'Save failed' }] },
          { status: 500 }
        );
      }
      if (typeof patch.pov === 'string') outlinePovs.push(patch.pov);
      return HttpResponse.json({
        data: {
          updateDocumentById: {
            document: { ...DOC, ...patch, updatedAt: SAVED_AT },
          },
        },
      });
    }),
    graphql.query('GetOutline', () =>
      HttpResponse.json({
        data: {
          allDocuments: {
            nodes: outlinePovs.map((pov, i) => ({
              id: `n${i}`,
              title: 'Scene',
              parentId: null,
              position: i,
              kind: 'document',
              status: null,
              wordCount: 0,
              pov,
            })),
          },
        },
      })
    ),
    graphql.query('GetDocument', () =>
      HttpResponse.json({ data: { documentById: DOC } })
    )
  );
  return patches;
}

function setup({
  details = DOC,
  requestFocus = false,
  ui = <DocumentInspector details={details} />,
}: {
  details?: DocumentDetails;
  requestFocus?: boolean;
  ui?: ReactElement;
} = {}) {
  const store = createStore();
  store.set(openInspectorAtom);
  if (!requestFocus) store.set(inspectorFocusRequestedAtom, false);
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  renderWithProviders(ui, {
    store,
    queryClient,
    initialRoute: `/project/${MOCK_PROJECT.id}`,
    routePath: '/project/:projectId',
  });
  return { store, user };
}

// Mirrors DocumentPage: the panel's details come from the document query, so a
// save that writes the cache is what moves Updated.
function LiveInspector() {
  const { data } = useQuery({
    queryKey: ['document', DOC.id],
    queryFn: () =>
      graphqlClient.request<{ documentById: DocumentDetails }>(GET_DOCUMENT, {
        id: DOC.id,
      }),
  });
  return data ? <DocumentInspector details={data.documentById} /> : null;
}

const field = (name: string) => screen.getByLabelText(name);

const povOptions = () => {
  const listId = field('POV').getAttribute('list');
  const datalist = document.getElementById(listId ?? '');
  return [...(datalist?.querySelectorAll('option') ?? [])].map((o) => o.value);
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(toast.error).mockClear();
  queryClient.removeQueries({ queryKey: ['document'] });
  queryClient.removeQueries({ queryKey: ['outline'] });
});

describe('DocumentInspector — details fields', () => {
  it("shows the document's title, status, summary and POV", () => {
    captureSaves();
    setup();

    expect(field('Title')).toHaveValue('The Arrival');
    expect(
      screen.getByRole('button', { name: 'Status: Drafting' })
    ).toBeInTheDocument();
    expect(field('Summary')).toHaveValue('Mara arrives in Lisbon.');
    expect(field('POV')).toHaveValue('Mara');
  });

  it('has no labels field and no word count', () => {
    captureSaves();
    setup();

    expect(screen.queryByLabelText(/labels?/i)).toBeNull();
    expect(screen.queryByText(/words?$/i)).toBeNull();
  });

  it('leaves POV off a folder', () => {
    captureSaves();
    setup({ details: { ...DOC, kind: 'folder', title: 'Chapter One' } });

    expect(field('Title')).toHaveValue('Chapter One');
    expect(field('Summary')).toBeInTheDocument();
    expect(screen.queryByLabelText('POV')).toBeNull();
  });

  it('puts focus in Title when the panel is opened', () => {
    captureSaves();
    setup({ requestFocus: true });

    expect(field('Title')).toHaveFocus();
  });
});

describe('DocumentInspector — editing', () => {
  it('saves the title when it loses focus', async () => {
    const patches = captureSaves();
    const { user } = setup();

    await user.clear(field('Title'));
    await user.type(field('Title'), 'Dinner ');
    await user.tab();

    await waitFor(() => expect(patches).toEqual([{ title: 'Dinner' }]));
  });

  it('puts the title back instead of saving an empty one', async () => {
    const patches = captureSaves();
    const { user } = setup();

    await user.clear(field('Title'));
    await user.tab();

    expect(field('Title')).toHaveValue('The Arrival');
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(patches).toEqual([]);
  });

  it('saves a first status straight away', async () => {
    const patches = captureSaves();
    const { user } = setup({ details: { ...DOC, status: null } });

    await user.click(screen.getByRole('button', { name: 'Set status' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Drafting' }));

    await waitFor(() => expect(patches).toEqual([{ status: 'drafting' }]));
  });

  it('saves a status picked from the menu', async () => {
    const patches = captureSaves();
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Status: Drafting' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Done' }));

    await waitFor(() => expect(patches).toEqual([{ status: 'done' }]));
    expect(
      screen.getByRole('button', { name: 'Status: Done' })
    ).toBeInTheDocument();
  });

  // The panel closes on Escape, but a menu open inside it gets that Escape
  // first: one press, one layer.
  it('closes only the status menu on Escape, not the panel', async () => {
    captureSaves();
    const { store, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Status: Drafting' }));
    await screen.findByRole('menu');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(store.get(inspectorAtom).isOpen).toBe(true);
  });

  it('saves the summary after a pause in typing', async () => {
    const patches = captureSaves();
    const { user } = setup();

    await user.clear(field('Summary'));
    await user.type(field('Summary'), 'She finds the door open.');
    expect(patches).toEqual([]);

    await act(() => vi.advanceTimersByTimeAsync(1000));

    await waitFor(() =>
      expect(patches).toEqual([{ summary: 'She finds the door open.' }])
    );
  });

  it('offers the POV names already used in the manuscript', async () => {
    captureSaves();
    setup();

    await waitFor(() => expect(povOptions()).toEqual(['Mara', 'Teo']));
  });

  // Picking from a datalist arrives as one change with the whole value, not
  // keystrokes, and must still wait for the pause like typed text.
  it('saves a picked POV suggestion after the same pause as typing', async () => {
    const patches = captureSaves();
    setup({ details: { ...DOC, pov: '' } });
    await waitFor(() => expect(povOptions()).toContain('Teo'));

    fireEvent.change(field('POV'), { target: { value: 'Teo' } });
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(patches).toEqual([]);

    await act(() => vi.advanceTimersByTimeAsync(500));
    await waitFor(() => expect(patches).toEqual([{ pov: 'Teo' }]));
  });

  it('takes a new POV when none exist yet, and offers it once saved', async () => {
    const patches = captureSaves({ povs: ['', ''] });
    const { user } = setup({ details: { ...DOC, pov: '' } });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(povOptions()).toEqual([]);

    await user.type(field('POV'), 'Inès');
    await act(() => vi.advanceTimersByTimeAsync(1000));

    await waitFor(() => expect(patches).toEqual([{ pov: 'Inès' }]));
    await waitFor(() => expect(povOptions()).toEqual(['Inès']));
  });
});

describe('DocumentInspector — save status', () => {
  it('says saved once a change lands', async () => {
    captureSaves();
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Status: Drafting' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Planned' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Saved');
  });

  it("shows the server's new Updated time once a change lands", async () => {
    captureSaves();
    const { user } = setup({ ui: <LiveInspector /> });

    await user.click(
      await screen.findByRole('button', { name: 'Status: Drafting' })
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Done' }));

    const updated = () =>
      screen.getByText('Updated').nextElementSibling?.querySelector('time');
    await waitFor(() =>
      expect(updated()).toHaveAttribute('dateTime', SAVED_AT)
    );
  });

  it('keeps the typed text and raises a toast when a save fails', async () => {
    captureSaves({ failures: 1 });
    const { user } = setup();

    await user.clear(field('Summary'));
    await user.type(field('Summary'), 'She finds the door open.');
    await act(() => vi.advanceTimersByTimeAsync(1000));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent("Couldn't save")
    );
    expect(field('Summary')).toHaveValue('She finds the door open.');
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('offers a retry when a save fails, and recovers', async () => {
    const patches = captureSaves({ failures: 1 });
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Status: Drafting' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Done' }));

    const status = await screen.findByRole('status');
    await waitFor(() => expect(status).toHaveTextContent("Couldn't save"));

    await user.click(within(status).getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(status).toHaveTextContent('Saved'));
    expect(patches).toEqual([{ status: 'done' }, { status: 'done' }]);
  });
});
