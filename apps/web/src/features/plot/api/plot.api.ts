import { gql } from 'graphql-request';
import { queryOptions } from '@tanstack/react-query';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import type { Plot, PlotBeat, Plotline } from '@web/features/plot/plot.types';

export const GET_PLOT = gql`
  query GetPlot($projectId: UUID!) {
    allPlotlines(condition: { projectId: $projectId }, orderBy: POSITION_ASC) {
      nodes {
        id
        name
        color
        position
      }
    }
    allPlotBeats(condition: { projectId: $projectId }, orderBy: POSITION_ASC) {
      nodes {
        id
        name
        position
      }
    }
  }
`;

interface GetPlotData {
  allPlotlines: { nodes: Plotline[] };
  allPlotBeats: { nodes: PlotBeat[] };
}

export function plotQueryKey(projectId: string | undefined) {
  return ['plot', projectId] as const;
}

// The cache holds the Plot shape itself, not the raw response, so optimistic
// updates edit the same object the views read.
export function plotQueryOptions(projectId: string | undefined) {
  return queryOptions({
    queryKey: plotQueryKey(projectId),
    queryFn: async (): Promise<Plot> => {
      const data = await graphqlClient.request<GetPlotData>(GET_PLOT, {
        projectId,
      });
      return {
        plotlines: data.allPlotlines.nodes,
        beats: data.allPlotBeats.nodes,
      };
    },
    enabled: !!projectId,
  });
}
