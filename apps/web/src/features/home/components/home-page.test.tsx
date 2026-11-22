import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import userEvent from '@testing-library/user-event';
import { Link, Routes, Route, useNavigate } from 'react-router-dom';
import { Button } from '@ui/components/ui/button';
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

  it('replaces its own history entry, so Back returns to the previous page', async () => {
    const user = userEvent.setup();
    const store = createStore();
    store.set(tokenAtom, MOCK_TOKEN);

    function BackButton() {
      const navigate = useNavigate();
      return <Button onClick={() => navigate(-1)}>Back</Button>;
    }

    renderWithProviders(
      <Routes>
        <Route
          path="/project/:projectId/plot"
          element={<Link to={`/project/${MOCK_PROJECT.id}`}>Story</Link>}
        />
        <Route path="/project/:projectId" element={<HomePage />} />
        <Route
          path="/project/:projectId/document/:documentId"
          element={<BackButton />}
        />
      </Routes>,
      { store, initialRoute: `/project/${MOCK_PROJECT.id}/plot` }
    );

    await user.click(screen.getByRole('link', { name: 'Story' }));
    await user.click(await screen.findByRole('button', { name: 'Back' }));

    expect(
      await screen.findByRole('link', { name: 'Story' })
    ).toBeInTheDocument();
  });
});
