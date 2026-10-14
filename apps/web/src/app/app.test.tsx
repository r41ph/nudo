import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import App from '@web/app/app';
import { renderWithProviders, createStore } from '@web/test/test-utils';
import { tokenAtom, userAtom } from '@web/features/auth/state/auth.store';
import {
  MOCK_USER,
  MOCK_DOCUMENT,
  MOCK_PROJECT,
} from '@web/test/mocks/fixtures';

function signedInStore() {
  const store = createStore();
  store.set(tokenAtom, 'fake-token');
  store.set(userAtom, MOCK_USER);
  return store;
}

vi.mock('@web/layouts/app-layout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

vi.mock('@web/layouts/workspace-layout', () => ({
  WorkspaceLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="workspace-layout">{children}</div>
  ),
}));

vi.mock('@web/features/document/components/document-page', () => ({
  DocumentPage: () => <div data-testid="document-page">DocumentPage</div>,
}));

vi.mock('@web/features/home/components/home-page', () => ({
  HomePage: () => <div data-testid="home-page">HomePage</div>,
}));

describe('App routing', () => {
  it('renders login page at /login', () => {
    renderWithProviders(<App />, { initialRoute: '/login' });
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders login page at /register', () => {
    renderWithProviders(<App />, { initialRoute: '/register' });
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('sends / to the active project, inside the app shell', async () => {
    renderWithProviders(<App />, { store: signedInStore(), initialRoute: '/' });

    await waitFor(() =>
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    );
    expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-layout')).toBeInTheDocument();
  });

  it('sends a signed-out visitor at / to the login page', () => {
    renderWithProviders(<App />, { initialRoute: '/' });
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders the document page at /project/:projectId/document/:documentId', async () => {
    renderWithProviders(<App />, {
      store: signedInStore(),
      initialRoute: `/project/${MOCK_PROJECT.id}/document/${MOCK_DOCUMENT.id}`,
    });

    expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-layout')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('document-page')).toBeInTheDocument()
    );
  });

  it('shows not found for a project the user cannot see', async () => {
    renderWithProviders(<App />, {
      store: signedInStore(),
      initialRoute: '/project/00000000-0000-0000-0000-000000000000',
    });

    expect(await screen.findByText('Project not found')).toBeInTheDocument();
    expect(screen.queryByTestId('app-layout')).not.toBeInTheDocument();
  });

  it('no longer serves the old /document/:id route', () => {
    renderWithProviders(<App />, {
      store: signedInStore(),
      initialRoute: `/document/${MOCK_DOCUMENT.id}`,
    });
    expect(screen.queryByTestId('document-page')).not.toBeInTheDocument();
  });

  it('login and register routes do not render app shell', () => {
    renderWithProviders(<App />, { initialRoute: '/login' });
    expect(screen.queryByTestId('app-layout')).not.toBeInTheDocument();
  });
});
