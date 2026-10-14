import { useQuery } from '@tanstack/react-query';
import { projectsQueryOptions } from '@web/shared/api/project.api';
import { useProjectId } from '@web/shared/hooks/use-project-id';

export function useProjects() {
  return useQuery(projectsQueryOptions);
}

export function useActiveProject() {
  const projectId = useProjectId();
  const query = useProjects();
  return {
    ...query,
    project: query.data?.find((p) => p.id === projectId),
  };
}
