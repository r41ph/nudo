import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { graphql, HttpResponse } from 'msw';
import { DocumentInspector } from '@web/features/document/components/document-inspector';
import type { DocumentDetails } from '@web/features/document/document.types';
import { queryClient } from '@web/shared/lib/query-client';
import {
  inspectorAtom,
  inspectorFocusRequestedAtom,
  openInspectorAtom,
} from '@web/shared/state/panels.atom';
import { server } from '@web/test/mocks/server';
import { renderWithProviders, createStore } from '@web/test/test-utils';

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

type Patch = Record<string, unknown>;

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
            document: { ...DOC, ...(variables.patch as Patch) },
          },
        },
      });
    }),
    graphql.query('GetOutline', () =>
      HttpResponse.json({
        data: {
          allDocuments: {
            nodes: ['Mara', 'Teo', 'Mara', ''].map((pov, i) => ({
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
    )
  );
  return patches;
}

function setup({
  details = DOC,
  requestFocus = false,
}: { details?: DocumentDetails; requestFocus?: boolean } = {}) {
  const store = createStore();
  store.set(openInspectorAtom);
  if (!requestFocus) store.set(inspectorFocusRequestedAtom, false);
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  renderWithProviders(<DocumentInspector details={details} />, { store });
  return { store, user };
}

const field = (name: string) => screen.getByLabelText(name);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  queryClient.removeQueries({ queryKey: ['document'] });
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

    const listId = field('POV').getAttribute('list');
    expect(listId).toBeTruthy();
    const datalist = document.getElementById(listId as string);

    await waitFor(() =>
      expect(
        [...(datalist?.querySelectorAll('option') ?? [])].map((o) => o.value)
      ).toEqual(['Mara', 'Teo'])
    );
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

  it('offers a retry when a save fails, and recovers', async () => {
    const patches = captureSaves(1);
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
