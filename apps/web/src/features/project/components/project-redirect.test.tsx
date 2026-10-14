import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { graphql, HttpResponse } from 'msw';
import { Route, Routes, useParams } from 'react-router-dom';
import { ProjectRedirect } from '@web/features/project/components/project-redirect';
import { tokenAtom } from '@web/features/auth/state/auth.store';
import { server } from '@web/test/mocks/server';
import { renderWithProviders, createStore } from '@web/test/test-utils';
import { MOCK_TOKEN } from '@web/test/mocks/fixtures';

const OLDER = { id: '00000000-0000-0000-0000-00000000000a', title: 'Older' };
const NEWER = { id: '00000000-0000-0000-0000-00000000000b', title: 'Newer' };

function ProjectProbe() {
  return <p>opened {useParams().projectId}</p>;
}

function serveProjects(nodes: Array<{ id: string; title: string }>) {
  server.use(
    graphql.query('GetProjects', () =>
      HttpResponse.json({ data: { allProjects: { nodes } } })
    )
  );
}

function renderRoot(signedIn = true) {
  const store = createStore();
  store.set(tokenAtom, signedIn ? MOCK_TOKEN : null);
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<ProjectRedirect />} />
      <Route path="/project/:projectId" element={<ProjectProbe />} />
      <Route path="/login" element={<p>login</p>} />
    </Routes>,
    { store }
  );
}

afterEach(() => {
  localStorage.clear();
});

describe('ProjectRedirect', () => {
  it('opens the last-used project when it still exists', async () => {
    serveProjects([NEWER, OLDER]);
    localStorage.setItem('nudo:last-project', OLDER.id);

    renderRoot();

    expect(await screen.findByText(`opened ${OLDER.id}`)).toBeInTheDocument();
  });

  it('falls back to the newest project when the stored one is gone', async () => {
    serveProjects([NEWER, OLDER]);
    localStorage.setItem('nudo:last-project', 'deleted-project');

    renderRoot();

    expect(await screen.findByText(`opened ${NEWER.id}`)).toBeInTheDocument();
  });

  it('opens the newest project when nothing is stored', async () => {
    serveProjects([NEWER, OLDER]);

    renderRoot();

    expect(await screen.findByText(`opened ${NEWER.id}`)).toBeInTheDocument();
  });

  it('says so when there are no projects', async () => {
    serveProjects([]);

    renderRoot();

    expect(
      await screen.findByText('You have no projects yet.')
    ).toBeInTheDocument();
  });

  it('surfaces a load failure with a working retry', async () => {
    server.use(
      graphql.query('GetProjects', () =>
        HttpResponse.json({ errors: [{ message: 'boom' }] })
      )
    );

    renderRoot();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load your projects."
    );

    serveProjects([NEWER]);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText(`opened ${NEWER.id}`)).toBeInTheDocument();
  });

  it('sends a signed-out visitor to the login page', () => {
    renderRoot(false);
    expect(screen.getByText('login')).toBeInTheDocument();
  });
});
