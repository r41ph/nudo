'use client';

import type { Value } from 'platejs';

import type { TComment } from '@ui/components/ui/comment';

import { createPlatePlugin } from 'platejs/react';

import { BlockDiscussion } from '@ui/components/ui/block-discussion';

export type {
  DiscussionData,
  TDiscussion,
  TUser,
} from './discussion-kit.types';
import type { TDiscussion, TUser } from './discussion-kit.types';

type OnCreateDiscussion = (discussion: TDiscussion) => Promise<void>;

type OnEditComment = (
  discussionId: string,
  commentId: string,
  contentRich: Value
) => Promise<void>;

type OnDeleteComment = (
  discussionId: string,
  commentId: string
) => Promise<void>;

type OnAddReply = (comment: TComment) => Promise<void>;

type OnDeleteDiscussion = (discussionId: string) => Promise<void>;

type OnResolveDiscussion = (discussionId: string) => Promise<void>;
// This plugin is purely UI. Discussions, users and persistence callbacks
// are injected by the host app via editor.setOption(discussionPlugin, ...).
export const discussionPlugin = createPlatePlugin({
  key: 'discussion',
  options: {
    currentUserId: '' as string,
    discussions: [] as TDiscussion[],
    users: {} as Record<string, TUser>,
    onCreateDiscussion: undefined as OnCreateDiscussion | undefined,
    onEditComment: undefined as OnEditComment | undefined,
    onDeleteComment: undefined as OnDeleteComment | undefined,
    onAddReply: undefined as OnAddReply | undefined,
    onDeleteDiscussion: undefined as OnDeleteDiscussion | undefined,
    onResolveDiscussion: undefined as OnResolveDiscussion | undefined,
  },
})
  .configure({
    render: { aboveNodes: BlockDiscussion },
  })
  .extendSelectors(({ getOption }) => ({
    currentUser: () => getOption('users')[getOption('currentUserId')],
    user: (id: string) => getOption('users')[id],
  }));

export const DiscussionKit = [discussionPlugin];
