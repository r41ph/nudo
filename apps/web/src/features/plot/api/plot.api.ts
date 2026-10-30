import { gql } from 'graphql-request';
import { queryOptions } from '@tanstack/react-query';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import type {
  Plot,
  PlotBeat,
  PlotCard,
  Plotline,
} from '@web/features/plot/plot.types';

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
    allPlotCards(condition: { projectId: $projectId }, orderBy: POSITION_ASC) {
      nodes {
        id
        title
        description
        plotlineId
        beatId
        position
      }
    }
  }
`;

interface GetPlotData {
  allPlotlines: { nodes: Plotline[] };
  allPlotBeats: { nodes: PlotBeat[] };
  allPlotCards: { nodes: PlotCard[] };
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
        cards: data.allPlotCards.nodes,
      };
    },
    enabled: !!projectId,
  });
}

export const START_PLOT = gql`
  mutation StartPlot($projectId: UUID!) {
    startPlot(input: { plotProjectId: $projectId }) {
      clientMutationId
    }
  }
`;

// The client sends the id so the optimistic row is already the real one.
export const CREATE_PLOTLINE = gql`
  mutation CreatePlotline(
    $id: UUID!
    $projectId: UUID!
    $name: String!
    $color: String!
    $position: Int!
  ) {
    createPlotline(
      input: {
        plotline: {
          id: $id
          projectId: $projectId
          name: $name
          color: $color
          position: $position
        }
      }
    ) {
      plotline {
        id
      }
    }
  }
`;

export const UPDATE_PLOTLINE = gql`
  mutation UpdatePlotline($id: UUID!, $patch: PlotlinePatch!) {
    updatePlotlineById(input: { id: $id, plotlinePatch: $patch }) {
      plotline {
        id
      }
    }
  }
`;

export const DELETE_PLOTLINE = gql`
  mutation DeletePlotline($id: UUID!) {
    deletePlotlineById(input: { id: $id }) {
      deletedPlotlineId
    }
  }
`;

export const REORDER_PLOTLINES = gql`
  mutation ReorderPlotlines($projectId: UUID!, $ids: [UUID]!) {
    reorderPlotlines(input: { plotProjectId: $projectId, orderedIds: $ids }) {
      clientMutationId
    }
  }
`;

export const CREATE_PLOT_BEAT = gql`
  mutation CreatePlotBeat(
    $id: UUID!
    $projectId: UUID!
    $name: String!
    $position: Int!
  ) {
    createPlotBeat(
      input: {
        plotBeat: {
          id: $id
          projectId: $projectId
          name: $name
          position: $position
        }
      }
    ) {
      plotBeat {
        id
      }
    }
  }
`;

export const UPDATE_PLOT_BEAT = gql`
  mutation UpdatePlotBeat($id: UUID!, $patch: PlotBeatPatch!) {
    updatePlotBeatById(input: { id: $id, plotBeatPatch: $patch }) {
      plotBeat {
        id
      }
    }
  }
`;

export const DELETE_PLOT_BEAT = gql`
  mutation DeletePlotBeat($id: UUID!) {
    deletePlotBeatById(input: { id: $id }) {
      deletedPlotBeatId
    }
  }
`;

export const REORDER_PLOT_BEATS = gql`
  mutation ReorderPlotBeats($projectId: UUID!, $ids: [UUID]!) {
    reorderPlotBeats(input: { plotProjectId: $projectId, orderedIds: $ids }) {
      clientMutationId
    }
  }
`;
