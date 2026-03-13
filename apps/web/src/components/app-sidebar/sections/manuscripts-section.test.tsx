import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { ManuscriptsSection } from './manuscripts-section';
import { renderWithProviders } from '@web/test/test-utils';
import { server } from '@web/test/mocks/server';
import {
  MOCK_DOCUMENT,
  MOCK_DOCUMENT_2,
  MOCK_FOLDER,
} from '@web/test/mocks/fixtures';

// Mock FolderTree since it has heavy DnD dependencies
vi.mock('@web/components/folder-tree', () => ({
  FolderTree: ({
    folders,
    rootItems,
    activeItemId,
  }: {
    folders: Array<{ id: string; name: string; items: Array<{ id: string; title: string }> }>;
    rootItems: Array<{ id: string; title: string }>;
    activeItemId?: string;
  }) => (
    <div data-testid="folder-tree">
      {folders.map((f) => (
        <div key={f.id} data-testid={`folder-${f.id}`}>
          {f.name}
          {f.items.map((item) => (
            <div key={item.id} data-testid={`item-${item.id}`}>
              {item.title}
            </div>
          ))}
        </div>
      ))}
      {rootItems.map((item) => (
        <div key={item.id} data-testid={`root-item-${item.id}`}>
          {item.title}
        </div>
      ))}
      {activeItemId && (
        <span data-testid="active-item">{activeItemId}</span>
      )}
    </div>
  ),
}));

// Need to mock useParams for the activeDocId
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: MOCK_DOCUMENT.id }),
  };
});

describe('ManuscriptsSection', () => {
  it('renders the Manuscript label', async () => {
    renderWithProviders(<ManuscriptsSection />);
    expect(screen.getByText('Manuscript')).toBeInTheDocument();
  });

  it('renders root documents from the query', async () => {
    // Both MOCK_DOCUMENT and MOCK_DOCUMENT_2 have folderId: null (root items)
    renderWithProviders(<ManuscriptsSection />);

    await waitFor(() => {
      expect(
        screen.getByTestId(`root-item-${MOCK_DOCUMENT.id}`)
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId(`root-item-${MOCK_DOCUMENT_2.id}`)
    ).toBeInTheDocument();
  });

  it('renders folders from the query', async () => {
    renderWithProviders(<ManuscriptsSection />);

    await waitFor(() => {
      expect(
        screen.getByTestId(`folder-${MOCK_FOLDER.id}`)
      ).toBeInTheDocument();
    });
    expect(screen.getByText(MOCK_FOLDER.name)).toBeInTheDocument();
  });

  it('shows the active document id', async () => {
    renderWithProviders(<ManuscriptsSection />);

    await waitFor(() => {
      const activeItem = screen.getByTestId('active-item');
      expect(activeItem).toHaveTextContent(MOCK_DOCUMENT.id);
    });
  });

  it('renders documents nested inside folders', async () => {
    // Override folders to include a document inside the folder
    server.use(
      graphql.query('GetFolders', () => {
        return HttpResponse.json({
          data: {
            allFolders: {
              nodes: [
                {
                  ...MOCK_FOLDER,
                  documentsByFolderId: {
                    nodes: [
                      {
                        id: 'nested-doc-id',
                        title: 'Nested Document',
                        updatedAt: '2026-01-01T00:00:00Z',
                        position: 0,
                      },
                    ],
                  },
                },
              ],
            },
          },
        });
      })
    );

    renderWithProviders(<ManuscriptsSection />);

    await waitFor(() => {
      expect(screen.getByTestId('item-nested-doc-id')).toBeInTheDocument();
    });
    expect(screen.getByText('Nested Document')).toBeInTheDocument();
  });

  it('handles empty state with no documents or folders', async () => {
    server.use(
      graphql.query('GetDocuments', () => {
        return HttpResponse.json({
          data: { allDocuments: { nodes: [] } },
        });
      }),
      graphql.query('GetFolders', () => {
        return HttpResponse.json({
          data: { allFolders: { nodes: [] } },
        });
      })
    );

    renderWithProviders(<ManuscriptsSection />);

    await waitFor(() => {
      expect(screen.getByTestId('folder-tree')).toBeInTheDocument();
    });

    // No root items or folders should render
    expect(screen.queryByTestId(/^root-item-/)).not.toBeInTheDocument();
    expect(screen.queryByTestId(/^folder-(?!tree)/)).not.toBeInTheDocument();
  });
});
