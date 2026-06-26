import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { ManuscriptsSection } from '@web/features/sidebar/components/sections/manuscripts-section';
import { renderWithProviders } from '@web/test/test-utils';
import { server } from '@web/test/mocks/server';
import { MOCK_DOCUMENT, MOCK_DOCUMENT_2 } from '@web/test/mocks/fixtures';
import type {
  NodeKind,
  NodeStatus,
  OutlineNode,
} from '@web/features/outline/outline.types';

const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

// OutlineTree has heavy DnD internals; mock it to render the `nodes` it receives
// and expose buttons wired to the real callbacks so container logic is testable.
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
      onSetStatus: (id: string, status: NodeStatus | null) => void;
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
            data-testid={`status-${n.id}`}
            onClick={() => callbacks.onSetStatus(n.id, 'done')}
          >
            status
          </button>
        </div>
      ))}
      {activeItemId && <span data-testid="active-item">{activeItemId}</span>}
    </div>
  ),
}));

// useParams → the active doc; capture navigation.
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: MOCK_DOCUMENT.id }),
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
  // Default: two root documents — the active one (MOCK_DOCUMENT) then a sibling.
  setOutline([
    onode(MOCK_DOCUMENT.id, { position: 0 }),
    onode(MOCK_DOCUMENT_2.id, { position: 1 }),
  ]);
});

describe('ManuscriptsSection', () => {
  it('renders the Story label', () => {
    renderWithProviders(<ManuscriptsSection />);
    expect(screen.getByText('Story')).toBeInTheDocument();
  });

  it('renders nodes from the outline query', async () => {
    renderWithProviders(<ManuscriptsSection />);
    await waitFor(() =>
      expect(screen.getByTestId(`node-${MOCK_DOCUMENT.id}`)).toBeInTheDocument()
    );
    expect(
      screen.getByTestId(`node-${MOCK_DOCUMENT_2.id}`)
    ).toBeInTheDocument();
  });

  it('passes the active item id through', async () => {
    renderWithProviders(<ManuscriptsSection />);
    await waitFor(() =>
      expect(screen.getByTestId('active-item')).toHaveTextContent(
        MOCK_DOCUMENT.id
      )
    );
  });

  it('opens the adjacent node when the active node is deleted', async () => {
    renderWithProviders(<ManuscriptsSection />);
    await waitFor(() =>
      expect(
        screen.getByTestId(`delete-${MOCK_DOCUMENT.id}`)
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`delete-${MOCK_DOCUMENT.id}`));

    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith(
        `/document/${MOCK_DOCUMENT_2.id}`
      )
    );
  });

  it('navigates home when the last node is deleted', async () => {
    setOutline([onode(MOCK_DOCUMENT.id, { position: 0 })]);
    renderWithProviders(<ManuscriptsSection />);
    await waitFor(() =>
      expect(
        screen.getByTestId(`delete-${MOCK_DOCUMENT.id}`)
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`delete-${MOCK_DOCUMENT.id}`));

    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith('/'));
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
    renderWithProviders(<ManuscriptsSection />);
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
    renderWithProviders(<ManuscriptsSection />);
    await waitFor(() =>
      expect(
        screen.getByTestId(`add-doc-${MOCK_DOCUMENT.id}`)
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`add-doc-${MOCK_DOCUMENT.id}`));

    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith('/document/new-node')
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
    renderWithProviders(<ManuscriptsSection />);
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
    renderWithProviders(<ManuscriptsSection />);
    await waitFor(() =>
      expect(
        screen.getByTestId(`status-${MOCK_DOCUMENT.id}`)
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`status-${MOCK_DOCUMENT.id}`));

    await waitFor(() => expect(captured).not.toBeNull());
    expect(captured).toEqual({ id: MOCK_DOCUMENT.id, status: 'done' });
  });

  it('surfaces a toast when a mutation fails', async () => {
    server.use(
      graphql.mutation('DeleteDocument', () =>
        HttpResponse.json({ errors: [{ message: 'boom' }] })
      )
    );
    renderWithProviders(<ManuscriptsSection />);
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
