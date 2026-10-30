import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { graphql, HttpResponse } from 'msw';
import { useLocation } from 'react-router-dom';
import { SidebarProvider } from '@ui/components/ui/sidebar';
import { SidebarFooterActions } from '@web/features/sidebar/components/sidebar-footer-actions';
import { userAtom } from '@web/features/auth/state/auth.store';
import { server } from '@web/test/mocks/server';
import { createStore, renderWithProviders } from '@web/test/test-utils';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}));

const LAMP = { id: 'aaaaaaaa-0000-0000-0000-000000000001', title: 'The Lamp' };
const SALT = { id: 'aaaaaaaa-0000-0000-0000-000000000002', title: 'Salt Year' };

function node(id: string, kind: 'document' | 'folder', parentId = null) {
  return {
    id,
    title: id,
    parentId,
    position: 0,
    kind,
    status: null,
    wordCount: 0,
    pov: null,
  };
}

// Mutable, so a refetch after create/rename/delete sees the change.
function serveProjects(initial: { id: string; title: string }[]) {
  let projects = [...initial];
  server.use(
    graphql.query('GetProjects', () =>
      HttpResponse.json({ data: { allProjects: { nodes: projects } } })
    ),
    graphql.query('GetOutline', () =>
      HttpResponse.json({
        data: {
          allDocuments: {
            nodes: [
              node('f1', 'folder'),
              node('d1', 'document'),
              node('d2', 'document'),
              node('d3', 'document'),
            ],
          },
        },
      })
    ),
    graphql.mutation('CreateProject', ({ variables }) => {
      const project = { id: 'new-project', title: variables.title as string };
      projects = [project, ...projects];
      return HttpResponse.json({ data: { createProject: { project } } });
    }),
    graphql.mutation('RenameProject', ({ variables }) => {
      projects = projects.map((p) =>
        p.id === variables.id ? { ...p, title: variables.title as string } : p
      );
      return HttpResponse.json({
        data: {
          updateProjectById: {
            project: { id: variables.id, title: variables.title },
          },
        },
      });
    }),
    graphql.mutation('DeleteProject', ({ variables }) => {
      projects = projects.filter((p) => p.id !== variables.id);
      return HttpResponse.json({
        data: { deleteProjectById: { deletedProjectId: variables.id } },
      });
    })
  );
}

function LocationProbe() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

function renderMenu(projectId = LAMP.id) {
  const store = createStore();
  store.set(userAtom, { id: 'u1', email: 'dev@rgalan.es', displayName: null });
  renderWithProviders(
    <SidebarProvider>
      <SidebarFooterActions />
      <LocationProbe />
    </SidebarProvider>,
    {
      store,
      initialRoute: `/project/${projectId}`,
      routePath: '/project/:projectId',
    }
  );
}

const user = () => userEvent.setup();

// Radix moves its roving focus in response; outside act that update warns.
const focus = (element: HTMLElement) => act(() => element.focus());

async function openProjects(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByRole('button', { name: 'Account: dev@rgalan.es' }));
  const trigger = await screen.findByRole('menuitem', { name: 'Projects' });
  focus(trigger);
  await u.keyboard('{ArrowRight}');
  const menus = await screen.findAllByRole('menu');
  return menus[menus.length - 1];
}

const location = () => screen.getByTestId('location').textContent;

describe('ProjectsSubmenu', () => {
  it('sits after Dark mode in the user menu', async () => {
    serveProjects([LAMP]);
    const u = user();
    renderMenu();

    await u.click(
      screen.getByRole('button', { name: 'Account: dev@rgalan.es' })
    );
    const menu = await screen.findByRole('menu');
    const labels = Array.from(
      menu.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"]')
    ).map((el) => el.textContent?.trim());

    expect(labels.slice(0, 2)).toEqual(['Dark mode', 'Projects']);
  });

  it('lists the projects with the active one checked, then the actions', async () => {
    serveProjects([LAMP, SALT]);
    const u = user();
    renderMenu();

    const submenu = await openProjects(u);

    await within(submenu).findByRole('menuitemradio', { name: 'The Lamp' });
    expect(
      within(submenu)
        .getAllByRole('menuitemradio')
        .map((item) => [item.textContent, item.getAttribute('aria-checked')])
    ).toEqual([
      ['The Lamp', 'true'],
      ['Salt Year', 'false'],
    ]);
    expect(
      within(submenu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent)
    ).toEqual(['New project…', 'Rename “The Lamp”…', 'Delete “The Lamp”…']);
    expect(within(submenu).getByRole('separator')).toBeInTheDocument();
  });

  it('switches project from the keyboard', async () => {
    serveProjects([LAMP, SALT]);
    const u = user();
    renderMenu();

    const submenu = await openProjects(u);
    focus(within(submenu).getByRole('menuitemradio', { name: 'Salt Year' }));
    await u.keyboard('{Enter}');

    expect(location()).toBe(`/project/${SALT.id}`);
  });

  it('closes the submenu with ArrowLeft and keeps the user menu open', async () => {
    serveProjects([LAMP]);
    const u = user();
    renderMenu();

    await openProjects(u);
    await u.keyboard('{ArrowLeft}');

    await waitFor(() => expect(screen.getAllByRole('menu')).toHaveLength(1));
    expect(screen.getByRole('menuitem', { name: 'Projects' })).toHaveFocus();
  });

  it('shows a disabled loading item while the projects load', async () => {
    server.use(graphql.query('GetProjects', () => new Promise(() => {})));
    const u = user();
    renderMenu();

    const submenu = await openProjects(u);

    expect(
      within(submenu).getByRole('menuitem', { name: 'Loading projects…' })
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('offers Retry when the projects fail to load', async () => {
    server.use(
      graphql.query('GetProjects', () =>
        HttpResponse.json({ errors: [{ message: 'boom' }] })
      )
    );
    const u = user();
    renderMenu();

    const submenu = await openProjects(u);
    expect(
      await within(submenu).findByText("Couldn't load projects")
    ).toBeInTheDocument();

    serveProjects([LAMP]);
    focus(within(submenu).getByRole('menuitem', { name: 'Retry' }));
    await u.keyboard('{Enter}');

    expect(
      await screen.findByRole('menuitemradio', { name: 'The Lamp' })
    ).toBeInTheDocument();
  });

  it('creates a project from New project… and opens it', async () => {
    serveProjects([LAMP]);
    const u = user();
    renderMenu();

    const submenu = await openProjects(u);
    await u.click(
      within(submenu).getByRole('menuitem', { name: 'New project…' })
    );
    const dialog = await screen.findByRole('dialog', { name: 'New project' });
    await u.type(within(dialog).getByLabelText('Title'), 'Salt Year{Enter}');

    await waitFor(() => expect(location()).toBe('/project/new-project'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('renames the active project and returns focus to the account button', async () => {
    serveProjects([LAMP]);
    const u = user();
    renderMenu();

    const submenu = await openProjects(u);
    await u.click(
      await within(submenu).findByRole('menuitem', {
        name: 'Rename “The Lamp”…',
      })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Rename project',
    });
    const input = within(dialog).getByLabelText('Title');
    expect(input).toHaveValue('The Lamp');
    await u.clear(input);
    await u.type(input, 'The Lantern{Enter}');

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Account: dev@rgalan.es' })
      ).toHaveFocus()
    );
    const reopened = await openProjects(u);
    expect(
      await within(reopened).findByRole('menuitemradio', {
        name: 'The Lantern',
      })
    ).toBeInTheDocument();
  });

  it('deletes the active project after typed confirmation and opens the next one', async () => {
    serveProjects([LAMP, SALT]);
    const u = user();
    renderMenu();

    const submenu = await openProjects(u);
    await u.click(
      await within(submenu).findByRole('menuitem', {
        name: 'Delete “The Lamp”…',
      })
    );
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Delete “The Lamp”?',
    });
    expect(dialog).toHaveTextContent('This removes its 3 documents');
    await u.type(
      within(dialog).getByLabelText('Type the title to confirm'),
      'the lamp{Enter}'
    );

    await waitFor(() => expect(location()).toBe(`/project/${SALT.id}`));
  });
});
