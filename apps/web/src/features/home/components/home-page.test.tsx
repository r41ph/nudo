import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
import { HomePage } from '@web/features/home/components/home-page';
import { server } from '@web/test/mocks/server';
import { renderWithProviders, createStore } from '@web/test/test-utils';
import { tokenAtom } from '@web/features/auth/state/auth.store';
import { MOCK_PROJECT, MOCK_TOKEN } from '@web/test/mocks/fixtures';

function renderHome() {
  const store = createStore();
  store.set(tokenAtom, MOCK_TOKEN);
  return renderWithProviders(
    <Routes>
      <Route path="/project/:projectId" element={<HomePage />} />
      <Route
        path="/project/:projectId/document/:documentId"
        element={<div data-testid="document-page">document</div>}
      />
    </Routes>,
    { store, initialRoute: `/project/${MOCK_PROJECT.id}` }
  );
}

describe('HomePage', () => {
  it('redirects to the first document when documents exist', async () => {
    renderHome();

    await waitFor(() =>
      expect(screen.getByTestId('document-page')).toBeInTheDocument()
    );
  });

  it('shows the empty state when the user has no documents', async () => {
    server.use(
      graphql.query('GetDocuments', () =>
        HttpResponse.json({ data: { allDocuments: { nodes: [] } } })
      )
    );

    renderHome();

    expect(await screen.findByText(/no documents yet/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create your first document/i })
    ).toBeInTheDocument();
  });

  it('surfaces an error instead of the empty state when the query fails', async () => {
    server.use(
      graphql.query('GetDocuments', () =>
        HttpResponse.json({ errors: [{ message: 'boom' }] }, { status: 500 })
      )
    );

    renderHome();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/couldn't load your documents/i);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/no documents yet/i)).not.toBeInTheDocument();
  });
});
