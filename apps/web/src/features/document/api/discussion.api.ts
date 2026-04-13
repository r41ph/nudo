import { gql } from 'graphql-request';

export const GET_DISCUSSIONS = gql`
  query GetDiscussions($documentId: UUID!) {
    allDiscussions(condition: { documentId: $documentId }) {
      nodes {
        id
        documentId
        isResolved
        documentContent
        createdAt
        userByUserId {
          id
          displayName
        }
        discussionCommentsByDiscussionId {
          nodes {
            id
            discussionId
            contentRich
            isEdited
            createdAt
            updatedAt
            userByUserId {
              id
              displayName
            }
          }
        }
      }
    }
  }
`;

export const CREATE_DISCUSSION = gql`
  mutation CreateDiscussion(
    $id: UUID!
    $documentId: UUID!
    $userId: UUID!
    $documentContent: String
  ) {
    createDiscussion(
      input: {
        discussion: {
          id: $id
          documentId: $documentId
          userId: $userId
          documentContent: $documentContent
        }
      }
    ) {
      discussion {
        id
      }
    }
  }
`;

export const CREATE_DISCUSSION_COMMENT = gql`
  mutation CreateDiscussionComment(
    $id: UUID!
    $discussionId: UUID!
    $userId: UUID!
    $contentRich: JSON!
  ) {
    createDiscussionComment(
      input: {
        discussionComment: {
          id: $id
          discussionId: $discussionId
          userId: $userId
          contentRich: $contentRich
        }
      }
    ) {
      discussionComment {
        id
      }
    }
  }
`;

export const UPDATE_DISCUSSION = gql`
  mutation UpdateDiscussion($id: UUID!, $isResolved: Boolean!) {
    updateDiscussionById(
      input: { id: $id, discussionPatch: { isResolved: $isResolved } }
    ) {
      discussion {
        id
        isResolved
      }
    }
  }
`;

export const UPDATE_DISCUSSION_COMMENT = gql`
  mutation UpdateDiscussionComment($id: UUID!, $contentRich: JSON!) {
    updateDiscussionCommentById(
      input: {
        id: $id
        discussionCommentPatch: { contentRich: $contentRich, isEdited: true }
      }
    ) {
      discussionComment {
        id
        contentRich
        isEdited
        updatedAt
      }
    }
  }
`;

export const DELETE_DISCUSSION = gql`
  mutation DeleteDiscussion($id: UUID!) {
    deleteDiscussionById(input: { id: $id }) {
      deletedDiscussionId
    }
  }
`;

export const DELETE_DISCUSSION_COMMENT = gql`
  mutation DeleteDiscussionComment($id: UUID!) {
    deleteDiscussionCommentById(input: { id: $id }) {
      deletedDiscussionCommentId
    }
  }
`;

export const PRUNE_ORPHANED_DISCUSSIONS = gql`
  mutation PruneOrphanedDiscussions($docId: UUID!, $activeIds: [UUID]!) {
    pruneOrphanedDiscussions(input: { docId: $docId, activeIds: $activeIds }) {
      clientMutationId
    }
  }
`;
