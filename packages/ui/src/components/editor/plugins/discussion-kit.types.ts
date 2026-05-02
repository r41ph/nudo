import type { Value } from 'platejs';

import type { TComment } from '@ui/components/ui/comment';

export type TDiscussion = {
  id: string;
  comments: TComment[];
  createdAt: Date;
  isResolved: boolean;
  userId: string;
  documentContent?: string;
};

export type TUser = {
  id: string;
  avatarUrl?: string;
  name: string;
  hue?: number;
};

export type DiscussionData = {
  currentUserId: string;
  discussions: TDiscussion[];
  users: Record<string, TUser>;
  onCreateDiscussion?: (discussion: TDiscussion) => Promise<void>;
  onEditComment?: (
    discussionId: string,
    commentId: string,
    contentRich: Value
  ) => Promise<void>;
  onDeleteComment?: (discussionId: string, commentId: string) => Promise<void>;
  onAddReply?: (comment: TComment) => Promise<void>;
  onDeleteDiscussion?: (discussionId: string) => Promise<void>;
  onResolveDiscussion?: (discussionId: string) => Promise<void>;
  pruneOrphanedDiscussions?: (activeIds: string[]) => Promise<void>;
};
