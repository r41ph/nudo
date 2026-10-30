import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { graphql, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { useProjectMutations } from '@web/features/project/hooks/use-project-mutations';
import { useProjects } from '@web/shared/hooks/use-projects';
import { server } from '@web/test/mocks/server';
import { MOCK_NEW_PROJECT_ID, MOCK_PROJECT } from '@web/test/mocks/fixtures';
import { renderHookWithProviders } from '@web/test/test-utils';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}));

const LAMP = { id: 'aaaaaaaa-0000-0000-0000-000000000001', title: 'The Lamp' };
const SALT = { id: 'aaaaaaaa-0000-0000-0000-000000000002', title: 'Salt Year' };
const MOTH = { id: 'aaaaaaaa-0000-0000-0000-000000000003', title: 'Moth' };

// Serves a mutable list so a refetch after delete sees the row gone.
function serveProjects(initial: { id: string; title: string }[]) {
  let projects = [...initial];
  server.use(
    graphql.query('GetProjects', () =>
      HttpResponse.json({ data: { allProjects: { nodes: projects } } })
    ),
    graphql.mutation('DeleteProject', ({ variables }) => {
      projects = projects.filter((p) => p.id !== variables.id);
      return HttpResponse.json({
        data: { deleteProjectById: { deletedProjectId: variables.id } },
      });
    })
  );
}

function failing(operation: string) {
  return graphql.mutation(operation, () =>
    HttpResponse.json({ errors: [{ message: 'boom' }] })
  );
}

function deferred() {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  return { gate, release };
}

// The test client has gcTime 0, so ['projects'] needs an observer for the
// optimistic rename to land somewhere readable.
async function renderMutations(initialRoute = '/project/start') {
  const hook = renderHookWithProviders(
    () => ({
      projects: useProjects(),
      mutations: useProjectMutations(),
      location: useLocation(),
    }),
    { initialRoute }
  );
  await waitFor(() =>
    expect(hook.result.current.projects.isSuccess).toBe(true)
  );
  return hook;
}

afterEach(() => {
  vi.mocked(toast.error).mockClear();
});

describe('useProjectMutations: create', () => {
  it('creates the project and opens it', async () => {
    const variables = vi.fn();
    server.use(
      graphql.mutation('CreateProject', ({ variables: vars }) => {
        variables(vars);
        return HttpResponse.json({
          data: {
            createProject: {
              project: { id: MOCK_NEW_PROJECT_ID, title: vars.title },
            },
          },
        });
      })
    );
    const { result } = await renderMutations();

    act(() => result.current.mutations.createProject.mutate('The Lamp'));

    await waitFor(() =>
      expect(result.current.location.pathname).toBe(
        `/project/${MOCK_NEW_PROJECT_ID}`
      )
    );
    expect(variables).toHaveBeenCalledWith({ title: 'The Lamp' });
  });

  it('stays put and toasts when creation fails', async () => {
    server.use(failing('CreateProject'));
    const { result } = await renderMutations();

    act(() => result.current.mutations.createProject.mutate('The Lamp'));

    await waitFor(() =>
      expect(result.current.mutations.createProject.isError).toBe(true)
    );
    expect(result.current.location.pathname).toBe('/project/start');
    expect(toast.error).toHaveBeenCalledWith(expect.any(String), {
      id: 'project-create-error',
    });
  });
});

describe('useProjectMutations: rename', () => {
  it('shows the new title before the server answers', async () => {
    const { gate, release } = deferred();
    server.use(
      graphql.mutation('RenameProject', async ({ variables }) => {
        await gate;
        return HttpResponse.json({
          data: {
            updateProjectById: {
              project: { id: variables.id, title: variables.title },
            },
          },
        });
      })
    );
    const { result } = await renderMutations();

    act(() =>
      result.current.mutations.renameProject.mutate({
        id: MOCK_PROJECT.id,
        title: 'The Lamp',
      })
    );

    await waitFor(() =>
      expect(result.current.projects.data).toEqual([
        { id: MOCK_PROJECT.id, title: 'The Lamp' },
      ])
    );
    release();
    await waitFor(() =>
      expect(result.current.mutations.renameProject.isSuccess).toBe(true)
    );
  });

  it('rolls the title back and toasts when the rename fails', async () => {
    const { gate, release } = deferred();
    server.use(
      graphql.mutation('RenameProject', async () => {
        await gate;
        return HttpResponse.json({ errors: [{ message: 'boom' }] });
      })
    );
    const { result } = await renderMutations();

    act(() =>
      result.current.mutations.renameProject.mutate({
        id: MOCK_PROJECT.id,
        title: 'The Lamp',
      })
    );
    await waitFor(() =>
      expect(result.current.projects.data?.[0].title).toBe('The Lamp')
    );
    release();

    await waitFor(() =>
      expect(result.current.mutations.renameProject.isError).toBe(true)
    );
    expect(result.current.projects.data?.[0].title).toBe(MOCK_PROJECT.title);
    expect(toast.error).toHaveBeenCalledWith(expect.any(String), {
      id: 'project-rename-error',
    });
  });
});

describe('useProjectMutations: delete', () => {
  it('moves to the next project in the list', async () => {
    serveProjects([LAMP, SALT, MOTH]);
    const { result } = await renderMutations(`/project/${SALT.id}`);

    act(() => result.current.mutations.deleteProject.mutate(SALT.id));

    await waitFor(() =>
      expect(result.current.location.pathname).toBe(`/project/${MOTH.id}`)
    );
  });

  it('moves to the previous project when the last one is deleted', async () => {
    serveProjects([LAMP, SALT, MOTH]);
    const { result } = await renderMutations(`/project/${MOTH.id}`);

    act(() => result.current.mutations.deleteProject.mutate(MOTH.id));

    await waitFor(() =>
      expect(result.current.location.pathname).toBe(`/project/${SALT.id}`)
    );
  });

  it('goes to / when no project is left', async () => {
    serveProjects([LAMP]);
    const { result } = await renderMutations(`/project/${LAMP.id}`);

    act(() => result.current.mutations.deleteProject.mutate(LAMP.id));

    await waitFor(() => expect(result.current.location.pathname).toBe('/'));
  });

  it('stays in the project and toasts when the delete fails', async () => {
    serveProjects([LAMP, SALT]);
    server.use(failing('DeleteProject'));
    const { result } = await renderMutations(`/project/${LAMP.id}`);

    act(() => result.current.mutations.deleteProject.mutate(LAMP.id));

    await waitFor(() =>
      expect(result.current.mutations.deleteProject.isError).toBe(true)
    );
    expect(result.current.location.pathname).toBe(`/project/${LAMP.id}`);
    expect(toast.error).toHaveBeenCalledWith(expect.any(String), {
      id: 'project-delete-error',
    });
  });
});
