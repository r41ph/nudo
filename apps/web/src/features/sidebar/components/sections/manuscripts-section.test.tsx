import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { ManuscriptsSection } from '@web/features/sidebar/components/sections/manuscripts-section';
import { renderWithProviders } from '@web/test/test-utils';
import { server } from '@web/test/mocks/server';
import {
  MOCK_DOCUMENT,
  MOCK_DOCUMENT_2,
  MOCK_FOLDER,
} from '@web/test/mocks/fixtures';

const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));

// Mock FolderTree since it has heavy DnD dependencies. Each item exposes a
// delete trigger wired to the real onDeleteItem callback so deletion behavior
// can be exercised.
vi.mock('@web/features/folder/components/folder-tree', () => ({
  FolderTree: ({
    folders,
    rootItems,
    activeItemId,
    callbacks,
  }: {
    folders: Array<{
      id: string;
      name: string;
      items: Array<{ id: string; title: string }>;
    }>;
    rootItems: Array<{ id: string; title: string }>;
    activeItemId?: string;
    callbacks: {
      onDeleteItem: (id: string) => void;
      onDeleteFolder: (id: string) => void;
    };
  }) => (
    <div data-testid="folder-tree">
      {folders.map((f) => (
        <div key={f.id} data-testid={`folder-${f.id}`}>
          {f.name}
          <button
            data-testid={`delete-folder-${f.id}`}
            onClick={() => callbacks.onDeleteFolder(f.id)}
          >
            delete folder
          </button>
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
          <button
            data-testid={`delete-${item.id}`}
            onClick={() => callbacks.onDeleteItem(item.id)}
          >
            delete
          </button>
        </div>
      ))}
      {activeItemId && <span data-testid="active-item">{activeItemId}</span>}
    </div>
  ),
}));

// Mock useParams for the activeDocId and capture navigation.
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: MOCK_DOCUMENT.id }),
    useNavigate: () => navigateSpy,
  };
});

beforeEach(() => {
  navigateSpy.mockClear();
});

describe('ManuscriptsSection', () => {
  it('renders the Story label', async () => {
    renderWithProviders(<ManuscriptsSection />);
    expect(screen.getByText('Story')).toBeInTheDocument();
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

  // Regression: deleting the document open in the editor must navigate away,
  // otherwise the editor keeps showing the just-deleted document.
  it('opens the adjacent document when the active document is deleted', async () => {
    // MOCK_DOCUMENT (active, position 0) and MOCK_DOCUMENT_2 (position 1) are
    // both root docs, so the next sibling is MOCK_DOCUMENT_2.
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

  it('navigates home (empty state) when the last document is deleted', async () => {
    server.use(
      graphql.query('GetDocuments', () =>
        HttpResponse.json({
          data: { allDocuments: { nodes: [MOCK_DOCUMENT] } },
        })
      ),
      graphql.query('GetFolders', () =>
        HttpResponse.json({ data: { allFolders: { nodes: [] } } })
      )
    );

    renderWithProviders(<ManuscriptsSection />);

    await waitFor(() =>
      expect(
        screen.getByTestId(`delete-${MOCK_DOCUMENT.id}`)
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`delete-${MOCK_DOCUMENT.id}`));

    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith('/'));
  });

  it('does not navigate when deleting a non-active document', async () => {
    let deleteResolved = false;
    server.use(
      graphql.mutation('DeleteDocument', ({ variables }) => {
        deleteResolved = true;
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

    // By the time the delete resolves, onSuccess (the only place that could
    // navigate) has run — so a non-active delete must have left navigate alone.
    await waitFor(() => expect(deleteResolved).toBe(true));
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  // Places the active document (MOCK_DOCUMENT) inside a folder, leaving
  // MOCK_DOCUMENT_2 as a remaining root document. Returns a flag that flips once
  // the folder mutation resolves.
  function seedActiveDocInFolder() {
    const state = { folderDeleted: false };
    server.use(
      graphql.query('GetDocuments', () =>
        HttpResponse.json({
          data: {
            allDocuments: {
              nodes: [
                { ...MOCK_DOCUMENT, folderId: MOCK_FOLDER.id, position: 0 },
                { ...MOCK_DOCUMENT_2, folderId: null, position: 0 },
              ],
            },
          },
        })
      ),
      graphql.query('GetFolders', () =>
        HttpResponse.json({
          data: {
            allFolders: {
              nodes: [
                {
                  ...MOCK_FOLDER,
                  documentsByFolderId: {
                    nodes: [
                      {
                        id: MOCK_DOCUMENT.id,
                        title: MOCK_DOCUMENT.title,
                        updatedAt: MOCK_DOCUMENT.updatedAt,
                        position: 0,
                      },
                    ],
                  },
                },
              ],
            },
          },
        })
      ),
      graphql.mutation('DeleteFolder', ({ variables }) => {
        state.folderDeleted = true;
        return HttpResponse.json({
          data: { deleteFolderById: { deletedFolderId: variables.id } },
        });
      })
    );
    return state;
  }

  it('opens a remaining document when a folder holding the active doc is deleted', async () => {
    seedActiveDocInFolder();
    renderWithProviders(<ManuscriptsSection />);

    await waitFor(() =>
      expect(
        screen.getByTestId(`delete-folder-${MOCK_FOLDER.id}`)
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`delete-folder-${MOCK_FOLDER.id}`));

    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith(
        `/document/${MOCK_DOCUMENT_2.id}`
      )
    );
  });

  it('navigates home when deleting a folder that holds the only documents', async () => {
    const state = { folderDeleted: false };
    server.use(
      graphql.query('GetDocuments', () =>
        HttpResponse.json({
          data: {
            allDocuments: {
              nodes: [
                { ...MOCK_DOCUMENT, folderId: MOCK_FOLDER.id, position: 0 },
              ],
            },
          },
        })
      ),
      graphql.query('GetFolders', () =>
        HttpResponse.json({
          data: {
            allFolders: {
              nodes: [
                {
                  ...MOCK_FOLDER,
                  documentsByFolderId: {
                    nodes: [
                      {
                        id: MOCK_DOCUMENT.id,
                        title: MOCK_DOCUMENT.title,
                        updatedAt: MOCK_DOCUMENT.updatedAt,
                        position: 0,
                      },
                    ],
                  },
                },
              ],
            },
          },
        })
      ),
      graphql.mutation('DeleteFolder', ({ variables }) => {
        state.folderDeleted = true;
        return HttpResponse.json({
          data: { deleteFolderById: { deletedFolderId: variables.id } },
        });
      })
    );

    renderWithProviders(<ManuscriptsSection />);

    await waitFor(() =>
      expect(
        screen.getByTestId(`delete-folder-${MOCK_FOLDER.id}`)
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`delete-folder-${MOCK_FOLDER.id}`));

    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith('/'));
  });

  it('does not navigate when deleting a folder without the active doc', async () => {
    // Default fixtures: active doc (MOCK_DOCUMENT) is a root doc, and MOCK_FOLDER
    // is empty — so deleting it must not move the editor.
    const state = { folderDeleted: false };
    server.use(
      graphql.mutation('DeleteFolder', ({ variables }) => {
        state.folderDeleted = true;
        return HttpResponse.json({
          data: { deleteFolderById: { deletedFolderId: variables.id } },
        });
      })
    );

    renderWithProviders(<ManuscriptsSection />);

    await waitFor(() =>
      expect(
        screen.getByTestId(`delete-folder-${MOCK_FOLDER.id}`)
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId(`delete-folder-${MOCK_FOLDER.id}`));

    await waitFor(() => expect(state.folderDeleted).toBe(true));
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
