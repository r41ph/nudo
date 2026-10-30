import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CREATE_PROJECT,
  DELETE_PROJECT,
  RENAME_PROJECT,
} from '@web/features/project/api/project.api';
import { PROJECTS_QUERY_KEY } from '@web/shared/api/project.api';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { projectPath } from '@web/shared/lib/routes';
import type { Project } from '@web/shared/types/project.types';

type ProjectsData = { allProjects: { nodes: Project[] } };

// The project after the deleted one in the list, else the one before it.
function neighbourOf(projects: Project[], id: string): Project | undefined {
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return undefined;
  return projects[index + 1] ?? projects[index - 1];
}

export function useProjectMutations() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const invalidateProjects = () =>
    queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });

  // /project/:id redirects to the first document, which create_project seeds.
  const createProject = useMutation({
    mutationFn: (title: string) =>
      graphqlClient.request<{ createProject: { project: Project } }>(
        CREATE_PROJECT,
        { title }
      ),
    onSuccess: ({ createProject: { project } }) =>
      navigate(projectPath(project.id)),
    onError: () =>
      toast.error('Could not create the project — try again.', {
        id: 'project-create-error',
      }),
    onSettled: invalidateProjects,
  });

  const renameProject = useMutation({
    mutationFn: (vars: { id: string; title: string }) =>
      graphqlClient.request(RENAME_PROJECT, vars),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: PROJECTS_QUERY_KEY });
      const previous =
        queryClient.getQueryData<ProjectsData>(PROJECTS_QUERY_KEY);
      if (previous) {
        queryClient.setQueryData<ProjectsData>(PROJECTS_QUERY_KEY, {
          allProjects: {
            nodes: previous.allProjects.nodes.map((p) =>
              p.id === id ? { ...p, title } : p
            ),
          },
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(PROJECTS_QUERY_KEY, context.previous);
      }
      toast.error('Could not rename the project — try again.', {
        id: 'project-rename-error',
      });
    },
    onSettled: invalidateProjects,
  });

  const deleteProject = useMutation({
    mutationFn: (id: string) => graphqlClient.request(DELETE_PROJECT, { id }),
    onSuccess: (_data, id) => {
      const projects =
        queryClient.getQueryData<ProjectsData>(PROJECTS_QUERY_KEY)?.allProjects
          .nodes ?? [];
      const next = neighbourOf(projects, id);
      navigate(next ? projectPath(next.id) : '/');
    },
    onError: () =>
      toast.error('Could not delete the project — try again.', {
        id: 'project-delete-error',
      }),
    onSettled: invalidateProjects,
  });

  return { createProject, renameProject, deleteProject };
}
