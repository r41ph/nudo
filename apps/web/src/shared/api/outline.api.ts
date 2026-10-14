import { gql } from 'graphql-request';
import { queryOptions } from '@tanstack/react-query';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import type { OutlineQueryData } from '@web/shared/types/outline.types';

// Flat; the tree is rebuilt client-side in outline-tree.utils.
export const GET_OUTLINE = gql`
  query GetOutline($projectId: UUID!) {
    allDocuments(condition: { projectId: $projectId }, orderBy: POSITION_ASC) {
      nodes {
        id
        title
        parentId
        position
        kind
        status
        wordCount
        pov
      }
    }
  }
`;

// One definition so the sidebar and the POV suggestions share a cache entry.
// Invalidating ['outline'] still reaches every project by prefix.
export function outlineQueryOptions(projectId: string | undefined) {
  return queryOptions({
    queryKey: ['outline', projectId],
    queryFn: () =>
      graphqlClient.request<OutlineQueryData>(GET_OUTLINE, { projectId }),
    enabled: !!projectId,
  });
}

export const SET_NODE_STATUS = gql`
  mutation SetNodeStatus($id: UUID!, $status: String) {
    updateDocumentById(input: { id: $id, documentPatch: { status: $status } }) {
      document {
        id
        status
      }
    }
  }
`;

export const MOVE_AND_REORDER_NODE = gql`
  mutation MoveAndReorderNode(
    $nodeId: UUID!
    $targetParentId: UUID
    $nodePositions: JSON!
  ) {
    moveAndReorderNode(
      input: {
        nodeId: $nodeId
        targetParentId: $targetParentId
        nodePositions: $nodePositions
      }
    ) {
      clientMutationId
    }
  }
`;
