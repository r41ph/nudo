import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { graphql, HttpResponse } from 'msw';
import { SidebarProvider } from '@ui/components/ui/sidebar';
import { ProjectHeader } from '@web/features/sidebar/components/project-header';
import { server } from '@web/test/mocks/server';
import { renderWithProviders } from '@web/test/test-utils';
import { MOCK_PROJECT } from '@web/test/mocks/fixtures';

function renderHeader() {
  return renderWithProviders(
    <SidebarProvider>
      <ProjectHeader />
    </SidebarProvider>,
    {
      initialRoute: `/project/${MOCK_PROJECT.id}`,
      routePath: '/project/:projectId',
    }
  );
}

describe('ProjectHeader', () => {
  it("shows the active project's title under the Manuscript label", async () => {
    renderHeader();

    expect(screen.getByText('Manuscript')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: MOCK_PROJECT.title })
    ).toBeInTheDocument();
  });

  it('shows the title of the project in the URL, not the first one', async () => {
    server.use(
      graphql.query('GetProjects', () =>
        HttpResponse.json({
          data: {
            allProjects: {
              nodes: [{ id: 'another', title: 'Another book' }, MOCK_PROJECT],
            },
          },
        })
      )
    );

    renderHeader();

    expect(
      await screen.findByRole('heading', { name: MOCK_PROJECT.title })
    ).toBeInTheDocument();
  });

  it('surfaces a load failure with a working retry', async () => {
    server.use(
      graphql.query(
        'GetProjects',
        () => HttpResponse.json({ errors: [{ message: 'boom' }] }),
        { once: true }
      )
    );

    renderHeader();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load projects"
    );
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByRole('heading', { name: MOCK_PROJECT.title })
    ).toBeInTheDocument();
  });
});
