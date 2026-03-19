import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import App from './App';
import { renderWithProviders, createStore } from '@web/test/test-utils';
import { tokenAtom, userAtom } from '@web/state/auth.atom';
import { MOCK_USER, MOCK_DOCUMENT } from '@web/test/mocks/fixtures';

// Mock heavy layout and document components to isolate routing logic
vi.mock('@web/components/layout/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@web/components/document/document-page', () => ({
  DocumentPage: () => <div data-testid="document-page">DocumentPage</div>,
}));

describe('App routing', () => {
  it('redirects unauthenticated users to /login', () => {
    renderWithProviders(<App />, { initialRoute: '/' });
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('redirects authenticated users to first document', async () => {
    const store = createStore();
    store.set(tokenAtom, 'fake-token');
    store.set(userAtom, MOCK_USER);

    renderWithProviders(<App />, { store, initialRoute: '/' });

    await waitFor(() => {
      expect(screen.getByTestId('document-page')).toBeInTheDocument();
    });
  });

  it('renders login page at /login', () => {
    renderWithProviders(<App />, { initialRoute: '/login' });
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders login page at /register for unauthenticated users', () => {
    renderWithProviders(<App />, { initialRoute: '/register' });
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('redirects authenticated users from /login to /', async () => {
    const store = createStore();
    store.set(tokenAtom, 'fake-token');
    store.set(userAtom, MOCK_USER);

    renderWithProviders(<App />, { store, initialRoute: '/login' });

    await waitFor(() => {
      expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    });
  });

  it('redirects authenticated users from /register to /', async () => {
    const store = createStore();
    store.set(tokenAtom, 'fake-token');
    store.set(userAtom, MOCK_USER);

    renderWithProviders(<App />, { store, initialRoute: '/register' });

    await waitFor(() => {
      expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    });
  });

  it('renders document page at /document/:id', () => {
    const store = createStore();
    store.set(tokenAtom, 'fake-token');
    store.set(userAtom, MOCK_USER);

    renderWithProviders(<App />, {
      store,
      initialRoute: `/document/${MOCK_DOCUMENT.id}`,
    });
    expect(screen.getByTestId('document-page')).toBeInTheDocument();
  });
});
