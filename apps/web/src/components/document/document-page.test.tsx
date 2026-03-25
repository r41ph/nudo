import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { DocumentPage } from './document-page';
import { renderWithProviders, createStore } from '@web/test/test-utils';
import { tokenAtom, userAtom } from '@web/state/auth.atom';
import { currentDocumentAtom } from '@web/state/document.atom';
import { MOCK_USER, MOCK_DOCUMENT } from '@web/test/mocks/fixtures';
import { server } from '@web/test/mocks/server';

// Mock heavy dependencies
vi.mock('@web/components/layout/document-layout', () => ({
  DocumentLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="document-layout">{children}</div>
  ),
}));

vi.mock('@writing-app/ui/src/components/main-editor/main-editor', () => ({
  MainEditor: ({
    children,
    enabledTools,
  }: {
    children?: React.ReactNode;
    enabledTools: string[];
  }) => (
    <div data-testid="main-editor" data-tools={JSON.stringify(enabledTools)}>
      {children}
    </div>
  ),
}));

vi.mock('@web/components/toolbar-dialog/toolbar-dialog', () => ({
  EditorToolbarDialog: () => (
    <div data-testid="toolbar-dialog">ToolbarDialog</div>
  ),
}));

// Mock react-router-dom's useParams
const mockNavigate = vi.fn();
let mockParams: Record<string, string> = {};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => mockNavigate,
  };
});

describe('DocumentPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockParams = { id: MOCK_DOCUMENT.id };
  });

  it('redirects to /login when not authenticated', async () => {
    const store = createStore();
    renderWithProviders(<DocumentPage />, { store });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('shows loading state while fetching document', () => {
    const store = createStore();
    store.set(tokenAtom, 'fake-token');
    store.set(userAtom, MOCK_USER);

    renderWithProviders(<DocumentPage />, { store });
    expect(screen.getByText('Loading document...')).toBeInTheDocument();
  });

  it('renders the editor when document is loaded', async () => {
    const store = createStore();
    store.set(tokenAtom, 'fake-token');
    store.set(userAtom, MOCK_USER);

    renderWithProviders(<DocumentPage />, { store });

    await waitFor(() => {
      expect(screen.getByTestId('main-editor')).toBeInTheDocument();
    });
    expect(screen.getByTestId('toolbar-dialog')).toBeInTheDocument();
  });

  it('sets currentDocumentAtom when document loads', async () => {
    const store = createStore();
    store.set(tokenAtom, 'fake-token');
    store.set(userAtom, MOCK_USER);

    renderWithProviders(<DocumentPage />, { store });

    await waitFor(() => {
      const doc = store.get(currentDocumentAtom);
      expect(doc).toMatchObject({
        id: MOCK_DOCUMENT.id,
        title: MOCK_DOCUMENT.title,
      });
    });
  });

  it('shows error when document is not found', async () => {
    mockParams = { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' };

    server.use(
      graphql.query('GetDocument', () => {
        return HttpResponse.json({
          data: { documentById: null },
        });
      })
    );

    const store = createStore();
    store.set(tokenAtom, 'fake-token');
    store.set(userAtom, MOCK_USER);

    renderWithProviders(<DocumentPage />, { store });

    await waitFor(() => {
      expect(screen.getByText('Document not found')).toBeInTheDocument();
    });
  });

  it('does not fetch when id is an invalid UUID', () => {
    mockParams = { id: 'not-a-uuid' };

    const store = createStore();
    store.set(tokenAtom, 'fake-token');
    store.set(userAtom, MOCK_USER);

    renderWithProviders(<DocumentPage />, { store });

    // Should show error/not found state since the query is disabled
    expect(screen.getByText('Document not found')).toBeInTheDocument();
  });
});
