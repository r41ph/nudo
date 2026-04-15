import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import type { Value } from 'platejs';

import type {
  TDiscussion,
  TUser,
} from '@ui/components/editor/plugins/discussion-kit';
import type { TComment } from '@ui/components/ui/comment';

import type {
  DbDiscussion,
  GetDiscussionsResult,
} from '@web/features/document/document.types';
import {
  CREATE_DISCUSSION,
  CREATE_DISCUSSION_COMMENT,
  DELETE_DISCUSSION,
  DELETE_DISCUSSION_COMMENT,
  GET_DISCUSSIONS,
  UPDATE_DISCUSSION,
  UPDATE_DISCUSSION_COMMENT,
} from '@web/features/document/api/discussion.api';
import { userIdAtom } from '@web/features/auth/state/auth.store';
import { graphqlClient } from '@web/shared/lib/graphql-client';

function toDiscussion(node: DbDiscussion): {
  discussion: TDiscussion;
  users: Record<string, TUser>;
} {
  const users: Record<string, TUser> = {};

  // TODO: populate avatarUrl once user avatar support is implemented
  users[node.userByUserId.id] = {
    id: node.userByUserId.id,
    name: node.userByUserId.displayName,
  };

  const comments: TComment[] = node.discussionCommentsByDiscussionId.nodes.map(
    (c) => {
      users[c.userByUserId.id] = {
        id: c.userByUserId.id,
        name: c.userByUserId.displayName,
      };
      return {
        id: c.id,
        contentRich: c.contentRich as Value,
        createdAt: new Date(c.createdAt),
        discussionId: c.discussionId,
        isEdited: c.isEdited,
        userId: c.userByUserId.id,
      };
    }
  );

  return {
    discussion: {
      id: node.id,
      comments,
      createdAt: new Date(node.createdAt),
      isResolved: node.isResolved,
      userId: node.userByUserId.id,
      documentContent: node.documentContent ?? undefined,
    },
    users,
  };
}

export function useDocumentDiscussions(
  documentId: string | null,
  isDiscussionOpen: boolean
) {
  const currentUserId = useAtomValue(userIdAtom) ?? '';
  const queryClient = useQueryClient();

  const queryKey = ['discussions', documentId];

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, documentId]
  );

  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      graphqlClient.request<GetDiscussionsResult>(GET_DISCUSSIONS, {
        documentId,
      }),
    enabled: !!documentId,
    refetchOnWindowFocus: true,
    refetchInterval: isDiscussionOpen ? 5000 : false,
  });

  const { discussions, users } = useMemo(() => {
    const nodes = data?.allDiscussions?.nodes ?? [];
    const usersMap: Record<string, TUser> = {};
    const mapped: TDiscussion[] = [];

    for (const node of nodes) {
      const { discussion, users: nodeUsers } = toDiscussion(node);
      mapped.push(discussion);
      Object.assign(usersMap, nodeUsers);
    }

    return { discussions: mapped, users: usersMap };
  }, [data]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const { mutateAsync: createDiscussionMutation } = useMutation({
    mutationFn: (vars: {
      id: string;
      documentId: string;
      userId: string;
      documentContent?: string;
    }) => graphqlClient.request(CREATE_DISCUSSION, vars),
    onSuccess: invalidate,
  });

  const { mutateAsync: createCommentMutation } = useMutation({
    mutationFn: (vars: {
      id: string;
      discussionId: string;
      userId: string;
      contentRich: Value;
    }) => graphqlClient.request(CREATE_DISCUSSION_COMMENT, vars),
    onSuccess: invalidate,
  });

  const { mutateAsync: updateDiscussionMutation } = useMutation({
    mutationFn: (vars: { id: string; isResolved: boolean }) =>
      graphqlClient.request(UPDATE_DISCUSSION, vars),
    onSuccess: invalidate,
  });

  const { mutateAsync: updateCommentMutation } = useMutation({
    mutationFn: (vars: { id: string; contentRich: Value }) =>
      graphqlClient.request(UPDATE_DISCUSSION_COMMENT, vars),
    onSuccess: invalidate,
  });

  const { mutateAsync: deleteDiscussionMutation } = useMutation({
    mutationFn: (vars: { id: string }) =>
      graphqlClient.request(DELETE_DISCUSSION, vars),
    onSuccess: invalidate,
  });

  const { mutateAsync: deleteCommentMutation } = useMutation({
    mutationFn: (vars: { id: string }) =>
      graphqlClient.request(DELETE_DISCUSSION_COMMENT, vars),
    onSuccess: invalidate,
  });

  // ── Callbacks (injected into discussionPlugin) ─────────────────────────────

  const onCreateDiscussion = useCallback(
    async (discussion: TDiscussion) => {
      if (!documentId) return;
      await createDiscussionMutation({
        id: discussion.id,
        documentId,
        userId: discussion.userId,
        documentContent: discussion.documentContent,
      });
      const first = discussion.comments[0];
      if (first) {
        await createCommentMutation({
          id: first.id,
          discussionId: discussion.id,
          userId: first.userId,
          contentRich: first.contentRich,
        });
      }
    },
    [documentId, createDiscussionMutation, createCommentMutation]
  );

  const onAddReply = useCallback(
    async (comment: TComment) => {
      await createCommentMutation({
        id: comment.id,
        discussionId: comment.discussionId,
        userId: comment.userId,
        contentRich: comment.contentRich,
      });
    },
    [createCommentMutation]
  );

  const onEditComment = useCallback(
    async (_discussionId: string, commentId: string, contentRich: Value) => {
      await updateCommentMutation({ id: commentId, contentRich });
    },
    [updateCommentMutation]
  );

  const onDeleteComment = useCallback(
    async (_discussionId: string, commentId: string) => {
      await deleteCommentMutation({ id: commentId });
    },
    [deleteCommentMutation]
  );

  const onDeleteDiscussion = useCallback(
    async (discussionId: string) => {
      await deleteDiscussionMutation({ id: discussionId });
    },
    [deleteDiscussionMutation]
  );

  const onResolveDiscussion = useCallback(
    async (discussionId: string) => {
      await updateDiscussionMutation({ id: discussionId, isResolved: true });
    },
    [updateDiscussionMutation]
  );

  return {
    currentUserId,
    discussions,
    onAddReply,
    onCreateDiscussion,
    onDeleteComment,
    onDeleteDiscussion,
    onEditComment,
    onResolveDiscussion,
    users,
  };
}
