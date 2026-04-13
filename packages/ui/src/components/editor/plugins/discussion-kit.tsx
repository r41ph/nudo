'use client';

import type { Value } from 'platejs';

import type { TComment } from '@ui/components/ui/comment';

import { createPlatePlugin } from 'platejs/react';

import { BlockDiscussion } from '@ui/components/ui/block-discussion';

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
  avatarUrl: string;
  name: string;
  hue?: number;
};

// This plugin is purely UI. Discussions, users and persistence callbacks
// are injected by the host app via editor.setOption(discussionPlugin, ...).
export const discussionPlugin = createPlatePlugin({
  key: 'discussion',
  options: {
    currentUserId: '' as string,
    discussions: [] as TDiscussion[],
    users: {} as Record<string, TUser>,
    onCreateDiscussion: undefined as
      | ((discussion: TDiscussion) => Promise<void>)
      | undefined,
    onEditComment: undefined as
      | ((
          discussionId: string,
          commentId: string,
          contentRich: Value
        ) => Promise<void>)
      | undefined,
    onDeleteComment: undefined as
      | ((discussionId: string, commentId: string) => Promise<void>)
      | undefined,
    onDeleteDiscussion: undefined as
      | ((discussionId: string) => Promise<void>)
      | undefined,
    onResolveDiscussion: undefined as
      | ((discussionId: string) => Promise<void>)
      | undefined,
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
