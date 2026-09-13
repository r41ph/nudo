import { gql } from 'graphql-request';

// Flat; the tree is rebuilt client-side in outline-tree.utils.
export const GET_OUTLINE = gql`
  query GetOutline {
    allDocuments(orderBy: POSITION_ASC) {
      nodes {
        id
        title
        parentId
        position
        kind
        status
        wordCount
      }
    }
  }
`;

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
