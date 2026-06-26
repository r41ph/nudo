import { gql } from 'graphql-request';

// The whole outline as one flat list — every node is a document with a
// parentId (null = root), a kind label, and an optional status. The tree shape
// is rebuilt client-side (see outline-tree.utils). Ordering is by position
// within each sibling group.
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

// Status lives on the document row; update it through the auto-CRUD patch.
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

// Reparent a node (targetParentId null = root) and persist the new ordering of
// the destination sibling group.
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
