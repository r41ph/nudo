import { gql } from 'graphql-request';
import { queryOptions } from '@tanstack/react-query';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import type { Project } from '@web/shared/types/project.types';

export const GET_PROJECTS = gql`
  query GetProjects {
    allProjects(orderBy: CREATED_AT_DESC) {
      nodes {
        id
        title
      }
    }
  }
`;

export const PROJECTS_QUERY_KEY = ['projects'] as const;

export const projectsQueryOptions = queryOptions({
  queryKey: PROJECTS_QUERY_KEY,
  queryFn: () =>
    graphqlClient.request<{ allProjects: { nodes: Project[] } }>(GET_PROJECTS),
  select: (data) => data.allProjects.nodes,
});
