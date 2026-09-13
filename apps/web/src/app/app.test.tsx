import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import App from '@web/app/app';
import { renderWithProviders, createStore } from '@web/test/test-utils';
import { tokenAtom, userAtom } from '@web/features/auth/state/auth.store';
import { MOCK_USER, MOCK_DOCUMENT } from '@web/test/mocks/fixtures';

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

  it('renders home page at / inside app shell', async () => {
    renderWithProviders(<App />, { initialRoute: '/' });
    expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-layout')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    );
  });

  it('renders document page at /document/:id inside app shell', async () => {
    const store = createStore();
    store.set(tokenAtom, 'fake-token');
    store.set(userAtom, MOCK_USER);

    renderWithProviders(<App />, {
      store,
      initialRoute: `/document/${MOCK_DOCUMENT.id}`,
    });

    expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-layout')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('document-page')).toBeInTheDocument()
    );
  });

  it('login and register routes do not render app shell', () => {
    renderWithProviders(<App />, { initialRoute: '/login' });
    expect(screen.queryByTestId('app-layout')).not.toBeInTheDocument();
  });
});
