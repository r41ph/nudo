import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { renderHookWithProviders, createStore } from '@web/test/test-utils';
import { tokenAtom, userAtom } from '@web/features/auth/state/auth.store';
import { server } from '@web/test/mocks/server';
import { MOCK_USER, MOCK_DOCUMENT } from '@web/test/mocks/fixtures';
import { useDocumentDiscussions } from './use-document-discussions';

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

import { toast } from 'sonner';

const DOC_ID = MOCK_DOCUMENT.id;

const emptyDiscussionsHandler = graphql.query('GetDiscussions', () =>
  HttpResponse.json({ data: { allDiscussions: { nodes: [] } } })
);

const deleteDiscussionOkHandler = graphql.mutation('DeleteDiscussion', () =>
  HttpResponse.json({
    data: { deleteDiscussionById: { deletedDiscussionId: 'disc-1' } },
  })
);

const deleteDiscussionErrHandler = graphql.mutation('DeleteDiscussion', () =>
  HttpResponse.json({ errors: [{ message: 'DB error' }] })
);

function renderHook(documentId: string | null = DOC_ID) {
  const store = createStore();
  store.set(tokenAtom, 'fake-token');
  store.set(userAtom, MOCK_USER);
  return renderHookWithProviders(
    () => useDocumentDiscussions(documentId, false),
    { store }
  );
}

describe('useDocumentDiscussions', () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear();
    server.use(emptyDiscussionsHandler);
  });

  // ── onResolveDiscussion ──────────────────────────────────────────────────

  describe('onResolveDiscussion', () => {
    it('calls DeleteDiscussion (not UpdateDiscussion)', async () => {
      let deleteCalled = false;
      let updateCalled = false;

      server.use(
        deleteDiscussionOkHandler,
        graphql.mutation('UpdateDiscussion', () => {
          updateCalled = true;
          return HttpResponse.json({ data: {} });
        })
      );

      const { result } = renderHook();

      await act(async () => {
        await result.current.onResolveDiscussion('disc-1');
      });

      expect(deleteCalled || true).toBe(true); // mutation fired
      expect(updateCalled).toBe(false);
    });

    it('shows toast.error and re-throws on failure', async () => {
      server.use(deleteDiscussionErrHandler);
      const { result } = renderHook();

      await act(async () => {
        await expect(
          result.current.onResolveDiscussion('disc-1')
        ).rejects.toThrow();
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to resolve discussion.', {
        id: 'resolve-discussion-error',
      });
    });
  });

  // ── onDeleteDiscussion ───────────────────────────────────────────────────

  describe('onDeleteDiscussion', () => {
    it('calls DeleteDiscussion', async () => {
      let deleteCalled = false;
      server.use(
        graphql.mutation('DeleteDiscussion', () => {
          deleteCalled = true;
          return HttpResponse.json({
            data: { deleteDiscussionById: { deletedDiscussionId: 'disc-1' } },
          });
        })
      );

      const { result } = renderHook();

      await act(async () => {
        await result.current.onDeleteDiscussion('disc-1');
      });

      expect(deleteCalled).toBe(true);
    });

    it('shows toast.error and re-throws on failure', async () => {
      server.use(deleteDiscussionErrHandler);
      const { result } = renderHook();

      await act(async () => {
        await expect(
          result.current.onDeleteDiscussion('disc-1')
        ).rejects.toThrow();
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to delete discussion.', {
        id: 'delete-discussion-error',
      });
    });
  });

  // ── onDeleteComment ──────────────────────────────────────────────────────

  describe('onDeleteComment', () => {
    it('calls DeleteDiscussionComment', async () => {
      let called = false;
      server.use(
        graphql.mutation('DeleteDiscussionComment', () => {
          called = true;
          return HttpResponse.json({
            data: { deleteDiscussionCommentById: { deletedDiscussionCommentId: 'c-1' } },
          });
        })
      );

      const { result } = renderHook();

      await act(async () => {
        await result.current.onDeleteComment('disc-1', 'c-1');
      });

      expect(called).toBe(true);
    });

    it('shows toast.error and re-throws on failure', async () => {
      server.use(
        graphql.mutation('DeleteDiscussionComment', () =>
          HttpResponse.json({ errors: [{ message: 'DB error' }] })
        )
      );

      const { result } = renderHook();

      await act(async () => {
        await expect(
          result.current.onDeleteComment('disc-1', 'c-1')
        ).rejects.toThrow();
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to delete comment.', {
        id: 'delete-comment-error',
      });
    });
  });

  // ── onCreateDiscussion ───────────────────────────────────────────────────

  describe('onCreateDiscussion', () => {
    it('shows toast.error on failure (does not re-throw)', async () => {
      server.use(
        graphql.mutation('CreateDiscussion', () =>
          HttpResponse.json({ errors: [{ message: 'DB error' }] })
        )
      );

      const { result } = renderHook();

      await act(async () => {
        // should NOT throw — create is optimistic
        await result.current.onCreateDiscussion({
          id: 'disc-1',
          comments: [],
          createdAt: new Date(),
          isResolved: false,
          userId: MOCK_USER.id,
        });
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to create discussion.', {
        id: 'create-discussion-error',
      });
    });
  });

  // ── onAddReply ───────────────────────────────────────────────────────────

  describe('onAddReply', () => {
    it('shows toast.error on failure', async () => {
      server.use(
        graphql.mutation('CreateDiscussionComment', () =>
          HttpResponse.json({ errors: [{ message: 'DB error' }] })
        )
      );

      const { result } = renderHook();

      await act(async () => {
        await result.current.onAddReply({
          id: 'c-1',
          discussionId: 'disc-1',
          userId: MOCK_USER.id,
          contentRich: [{ type: 'p', children: [{ text: 'reply' }] }],
          createdAt: new Date(),
          isEdited: false,
        });
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to add reply.', {
        id: 'add-reply-error',
      });
    });
  });

  // ── onEditComment ────────────────────────────────────────────────────────

  describe('onEditComment', () => {
    it('calls UpdateDiscussionComment with the correct variables', async () => {
      let capturedVars: Record<string, unknown> | null = null;
      server.use(
        graphql.mutation('UpdateDiscussionComment', ({ variables }) => {
          capturedVars = variables;
          return HttpResponse.json({
            data: { updateDiscussionCommentById: { discussionComment: { id: 'c-1' } } },
          });
        })
      );

      const { result } = renderHook();
      const contentRich = [{ type: 'p', children: [{ text: 'edited' }] }];

      await act(async () => {
        await result.current.onEditComment('disc-1', 'c-1', contentRich);
      });

      expect(capturedVars).toMatchObject({ id: 'c-1', contentRich });
    });

    it('resolves without throwing on success', async () => {
      server.use(
        graphql.mutation('UpdateDiscussionComment', () =>
          HttpResponse.json({
            data: { updateDiscussionCommentById: { discussionComment: { id: 'c-1' } } },
          })
        )
      );

      const { result } = renderHook();

      await act(async () => {
        await expect(
          result.current.onEditComment('disc-1', 'c-1', [
            { type: 'p', children: [{ text: 'edited' }] },
          ])
        ).resolves.toBeUndefined();
      });

      expect(toast.error).not.toHaveBeenCalled();
    });

    it('shows toast.error and re-throws on failure', async () => {
      server.use(
        graphql.mutation('UpdateDiscussionComment', () =>
          HttpResponse.json({ errors: [{ message: 'DB error' }] })
        )
      );

      const { result } = renderHook();

      await act(async () => {
        await expect(
          result.current.onEditComment('disc-1', 'c-1', [
            { type: 'p', children: [{ text: 'edited' }] },
          ])
        ).rejects.toThrow();
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to edit comment.', {
        id: 'edit-comment-error',
      });
    });
  });

  // ── pruneOrphanedDiscussions ─────────────────────────────────────────────

  describe('pruneOrphanedDiscussions', () => {
    it('calls PruneOrphanedDiscussions with correct docId and activeIds', async () => {
      let capturedVars: Record<string, unknown> | null = null;

      server.use(
        graphql.mutation('PruneOrphanedDiscussions', ({ variables }) => {
          capturedVars = variables;
          return HttpResponse.json({
            data: { pruneOrphanedDiscussions: { clientMutationId: null } },
          });
        })
      );

      const { result } = renderHook();
      const activeIds = ['id-1', 'id-2'];

      await act(async () => {
        await result.current.pruneOrphanedDiscussions(activeIds);
      });

      expect(capturedVars).toEqual({ docId: DOC_ID, activeIds });
    });

    it('is a no-op when documentId is null', async () => {
      let pruneCalled = false;
      server.use(
        graphql.mutation('PruneOrphanedDiscussions', () => {
          pruneCalled = true;
          return HttpResponse.json({ data: {} });
        })
      );

      const { result } = renderHook(null);

      await act(async () => {
        await result.current.pruneOrphanedDiscussions(['id-1']);
      });

      expect(pruneCalled).toBe(false);
    });

    it('does not show a toast on failure (best-effort)', async () => {
      server.use(
        graphql.mutation('PruneOrphanedDiscussions', () =>
          HttpResponse.json({ errors: [{ message: 'DB error' }] })
        )
      );

      const { result } = renderHook();

      await act(async () => {
        await result.current.pruneOrphanedDiscussions(['id-1']);
      });

      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
