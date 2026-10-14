import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { DraftSection } from '@web/features/sidebar/components/sections/draft-section';
import { renderWithProviders, createStore } from '@web/test/test-utils';
import { inspectorAtom } from '@web/shared/state/panels.atom';
import { server } from '@web/test/mocks/server';
import { queryClient } from '@web/shared/lib/query-client';
import {
  MOCK_DOCUMENT,
  MOCK_DOCUMENT_2,
  MOCK_PROJECT,
} from '@web/test/mocks/fixtures';
import type {
  NodeKind,
  NodeStatus,
  OutlineNode,
} from '@web/shared/types/outline.types';

const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

// OutlineTree's DnD internals don't run in jsdom; the mock exposes its
// callbacks as buttons.
vi.mock('@web/features/outline/components/outline-tree', () => ({
  OutlineTree: ({
    nodes,
    activeItemId,
    callbacks,
  }: {
    nodes: OutlineNode[];
    activeItemId?: string;
    callbacks: {
      onOpenNode: (id: string) => void;
      onDeleteNode: (id: string) => void;
      onAddChild: (parentId: string, kind: NodeKind) => void;
      onRenameNode: (id: string, title: string) => void;
      onSetStatus: (id: string, status: NodeStatus | null) => void;
      onOpenDetails: (id: string) => void;
    };
  }) => (
    <div data-testid="outline-tree">
      {nodes.map((n) => (
        <div key={n.id} data-testid={`node-${n.id}`}>
          <span>{n.title}</span>
          <button
            data-testid={`open-${n.id}`}
            onClick={() => callbacks.onOpenNode(n.id)}
          >
            open
          </button>
          <button
            data-testid={`delete-${n.id}`}
            onClick={() => callbacks.onDeleteNode(n.id)}
          >
            delete
          </button>
          <button
            data-testid={`add-doc-${n.id}`}
            onClick={() => callbacks.onAddChild(n.id, 'document')}
          >
            add doc
          </button>
          <button
            data-testid={`add-sep-${n.id}`}
            onClick={() => callbacks.onAddChild(n.id, 'separator')}
          >
            add sep
          </button>
          <button
            data-testid={`rename-${n.id}`}
            onClick={() => callbacks.onRenameNode(n.id, 'Renamed')}
          >
            rename
          </button>
          <button
            data-testid={`status-${n.id}`}
            onClick={() => callbacks.onSetStatus(n.id, 'done')}
          >
            status
          </button>
          <button
            data-testid={`details-${n.id}`}
            onClick={() => callbacks.onOpenDetails(n.id)}
          >
            details
          </button>
        </div>
      ))}
      {activeItemId && <span data-testid="active-item">{activeItemId}</span>}
    </div>
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({
      projectId: MOCK_PROJECT.id,
      documentId: MOCK_DOCUMENT.id,
    }),
    useNavigate: () => navigateSpy,
  };
});

const onode = (id: string, over: Partial<OutlineNode> = {}): OutlineNode => ({
  id,
  title: `Title ${id}`,
  parentId: null,
  position: 0,
  kind: 'document',
  status: null,
  wordCount: 0,
  pov: '',
  ...over,
});

const setOutline = (nodes: OutlineNode[]) =>
  server.use(
    graphql.query('GetOutline', () =>
      HttpResponse.json({ data: { allDocuments: { nodes } } })
    )
  );

beforeEach(() => {
  navigateSpy.mockClear();
  vi.mocked(toast.error).mockClear();
  setOutline([
    onode(MOCK_DOCUMENT.id, { position: 0 }),
    onode(MOCK_DOCUMENT_2.id, { position: 1 }),
  ]);
});

describe('DraftSection', () => {
  it("asks only for the active project's outline", async () => {
    const requested = vi.fn();
    server.use(
      graphql.query('GetOutline', ({ variables }) => {
        requested(variables);
        return HttpResponse.json({ data: { allDocuments: { nodes: [] } } });
      })
    );

    renderWithProviders(<DraftSection />);

    await waitFor(() =>
      expect(requested).toHaveBeenCalledWith({ projectId: MOCK_PROJECT.id })
    );
  });

  it('renders the Draft label', () => {
    renderWithProviders(<DraftSection />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders nodes from the outline query', async () => {
    renderWithProviders(<DraftSection />);
    await waitFor(() =>
      expect(screen.getByTestId(`node-${MOCK_DOCUMENT.id}`)).toBeInTheDocument()
    );
    expect(
      screen.getByTestId(`node-${MOCK_DOCUMENT_2.id}`)
    ).toBeInTheDocument();
  });

  it('passes the active item id through', async () => {
    renderWithProviders(<DraftSection />);
    await waitFor(() =>
      expect(screen.getByTestId('active-item')).toHaveTextContent(
        MOCK_DOCUMENT.id
      )
    );
  });

  it('opens the adjacent node when the active node is deleted', async () => {
    renderWithProviders(<DraftSection />);
    await waitFor(() =>
      expect(
        screen.getByTestId(`delete-${MOCK_DOCUMENT.id}`)
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`delete-${MOCK_DOCUMENT.id}`));

    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith(
        `/project/${MOCK_PROJECT.id}/document/${MOCK_DOCUMENT_2.id}`
      )
    );
  });

  it('navigates home when the last node is deleted', async () => {
    setOutline([onode(MOCK_DOCUMENT.id, { position: 0 })]);
    renderWithProviders(<DraftSection />);
    await waitFor(() =>
      expect(
        screen.getByTestId(`delete-${MOCK_DOCUMENT.id}`)
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`delete-${MOCK_DOCUMENT.id}`));

    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith(`/project/${MOCK_PROJECT.id}`)
    );
  });

  it('does not navigate when deleting a non-active node', async () => {
    let deleted = false;
    server.use(
      graphql.mutation('DeleteDocument', ({ variables }) => {
        deleted = true;
        return HttpResponse.json({
          data: { deleteDocumentById: { deletedDocumentId: variables.id } },
        });
      })
    );
    renderWithProviders(<DraftSection />);
    await waitFor(() =>
      expect(
        screen.getByTestId(`delete-${MOCK_DOCUMENT_2.id}`)
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`delete-${MOCK_DOCUMENT_2.id}`));

    await waitFor(() => expect(deleted).toBe(true));
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('adds a child node and opens it', async () => {
    let captured: Record<string, unknown> | null = null;
    server.use(
      graphql.mutation('CreateNode', ({ variables }) => {
        captured = variables;
        return HttpResponse.json({
          data: { createNode: { document: { id: 'new-node' } } },
        });
      })
    );
    renderWithProviders(<DraftSection />);
    await waitFor(() =>
      expect(
        screen.getByTestId(`add-doc-${MOCK_DOCUMENT.id}`)
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`add-doc-${MOCK_DOCUMENT.id}`));

    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith(
        `/project/${MOCK_PROJECT.id}/document/new-node`
      )
    );
    expect(captured).toMatchObject({
      kind: 'document',
      parentId: MOCK_DOCUMENT.id,
    });
  });

  it('adds a separator without opening an editor', async () => {
    let created = false;
    server.use(
      graphql.mutation('CreateNode', () => {
        created = true;
        return HttpResponse.json({
          data: { createNode: { document: { id: 'new-sep' } } },
        });
      })
    );
    renderWithProviders(<DraftSection />);
    await waitFor(() =>
      expect(
        screen.getByTestId(`add-sep-${MOCK_DOCUMENT.id}`)
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`add-sep-${MOCK_DOCUMENT.id}`));

    await waitFor(() => expect(created).toBe(true));
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('sets a node status', async () => {
    let captured: Record<string, unknown> | null = null;
    server.use(
      graphql.mutation('SetNodeStatus', ({ variables }) => {
        captured = variables;
        return HttpResponse.json({
          data: {
            updateDocumentById: {
              document: { id: variables.id, status: variables.status },
            },
          },
        });
      })
    );
    renderWithProviders(<DraftSection />);
    await waitFor(() =>
      expect(
        screen.getByTestId(`status-${MOCK_DOCUMENT.id}`)
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`status-${MOCK_DOCUMENT.id}`));

    await waitFor(() => expect(captured).not.toBeNull());
    expect(captured).toEqual({ id: MOCK_DOCUMENT.id, status: 'done' });
  });

  // An open inspector reads ['document', id]; without this it keeps the old
  // title and status.
  it.each([
    ['renaming', 'rename'],
    ['setting the status of', 'status'],
  ])('refetches the document after %s a node', async (_, action) => {
    server.use(
      graphql.mutation('SetNodeStatus', ({ variables }) =>
        HttpResponse.json({
          data: {
            updateDocumentById: {
              document: { id: variables.id, status: variables.status },
            },
          },
        })
      )
    );
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    renderWithProviders(<DraftSection />);

    fireEvent.click(await screen.findByTestId(`${action}-${MOCK_DOCUMENT.id}`));

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['document', MOCK_DOCUMENT.id],
      })
    );
    invalidate.mockRestore();
  });

  it('opens details for the active document in place', async () => {
    const store = createStore();
    renderWithProviders(<DraftSection />, { store });

    fireEvent.click(await screen.findByTestId(`details-${MOCK_DOCUMENT.id}`));

    expect(store.get(inspectorAtom).isOpen).toBe(true);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('opens another document before showing its details', async () => {
    const store = createStore();
    renderWithProviders(<DraftSection />, { store });

    fireEvent.click(await screen.findByTestId(`details-${MOCK_DOCUMENT_2.id}`));

    expect(navigateSpy).toHaveBeenCalledWith(
      `/project/${MOCK_PROJECT.id}/document/${MOCK_DOCUMENT_2.id}`
    );
    expect(store.get(inspectorAtom).isOpen).toBe(true);
  });

  it('surfaces a toast when a mutation fails', async () => {
    server.use(
      graphql.mutation('DeleteDocument', () =>
        HttpResponse.json({ errors: [{ message: 'boom' }] })
      )
    );
    renderWithProviders(<DraftSection />);
    await waitFor(() =>
      expect(
        screen.getByTestId(`delete-${MOCK_DOCUMENT.id}`)
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`delete-${MOCK_DOCUMENT.id}`));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Could not delete — try again.',
        {
          id: 'outline-delete-error',
        }
      )
    );
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
