import type { NodeKind, NodeStatus } from '@web/shared/types/outline.types';

export type DbDiscussionUser = { id: string; displayName: string };

export type DbDiscussionComment = {
  id: string;
  discussionId: string;
  contentRich: unknown;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  userByUserId: DbDiscussionUser;
};

export type DbDiscussion = {
  id: string;
  documentId: string;
  isResolved: boolean;
  documentContent: string | null;
  createdAt: string;
  userByUserId: DbDiscussionUser;
  discussionCommentsByDiscussionId: { nodes: DbDiscussionComment[] };
};

export type GetDiscussionsResult = {
  allDiscussions: { nodes: DbDiscussion[] };
};

// The inspector's view of a document: metadata only, no content.
export interface DocumentDetails {
  id: string;
  title: string;
  kind: NodeKind;
  status: NodeStatus | null;
  summary: string;
  pov: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentData {
  id: string;
  title: string;
  content: unknown[];
  wordCount: number;
}

export interface LiveWordCount {
  documentId: string;
  count: number;
}
