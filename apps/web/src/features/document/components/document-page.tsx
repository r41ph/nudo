import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { GET_DOCUMENT } from '@web/features/document/api/document.api';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { currentDocumentAtom, liveWordCountAtom } from '@web/features/document/state/document.store';
import { enabledToolsAtom } from '@web/features/toolbar/state/toolbar.store';
import { dialogAtom, isToolbarDialogOpenAtom } from '@web/shared/state/dialog.atom';
import { isAuthenticatedAtom, userIdAtom } from '@web/features/auth/state/auth.store';
import { DocumentLayout } from '@web/layouts/document-layout';
import { MainEditor } from '@writing-app/ui/src/components/main-editor/main-editor';
import { EditorToolbarDialog } from '@web/features/toolbar/components/toolbar-dialog';
import { useAutoSave } from '@web/features/document/components/document-page.hooks';
import { useDocumentDiscussions } from '@web/features/document/hooks/use-document-discussions';
import { useToolbarSettingsSync, useUserPreferences } from '@web/features/toolbar/hooks/toolbar.hooks';
import { isValidUuid } from '@web/shared/lib/uuid';
import type { Value } from 'platejs';
import { DIALOG } from '@web/shared/state/dialog.constants';

type GetDocumentResponse = {
  documentById: {
    id: string;
    title: string;
    slug: string;
    content: Value;
    plainText: string;
    wordCount: number;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const userId = useAtomValue(userIdAtom);
  const isDialogOpen = useAtomValue(isToolbarDialogOpenAtom);
  const setDialog = useSetAtom(dialogAtom);
  const enabledTools = useAtomValue(enabledToolsAtom);
  const setCurrentDocument = useSetAtom(currentDocumentAtom);
  const setLiveWordCount = useSetAtom(liveWordCountAtom);
  const isValidId = !!id && isValidUuid(id);

  const { data, isLoading, error } = useQuery({
    queryKey: ['document', id],
    queryFn: () =>
      graphqlClient.request<GetDocumentResponse>(GET_DOCUMENT, { id }),
    enabled: isValidId && isAuthenticated,
  });

  const doc = data?.documentById;

  const { scheduleAutoSave, saveNow } = useAutoSave(id || null);

  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);
  const {
    currentUserId: discussionUserId,
    discussions,
    users,
    onCreateDiscussion,
    onAddReply,
    onEditComment,
    onDeleteComment,
    onDeleteDiscussion,
    onResolveDiscussion,
  } = useDocumentDiscussions(id || null, isDiscussionOpen);

  const discussionData = useMemo(
    () => ({
      currentUserId: discussionUserId,
      discussions,
      users,
      onCreateDiscussion,
      onAddReply,
      onEditComment,
      onDeleteComment,
      onDeleteDiscussion,
      onResolveDiscussion,
    }),
    [
      discussionUserId,
      discussions,
      users,
      onCreateDiscussion,
      onAddReply,
      onEditComment,
      onDeleteComment,
      onDeleteDiscussion,
      onResolveDiscussion,
    ]
  );

  const liveCountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (liveCountTimerRef.current) clearTimeout(liveCountTimerRef.current);
    };
  }, []);

  const handleContentChange = useCallback(
    (content: unknown[]) => {
      scheduleAutoSave(content);
    },
    [scheduleAutoSave]
  );

  const handleWordCountChange = useCallback(
    (count: number) => {
      if (id) {
        if (liveCountTimerRef.current) clearTimeout(liveCountTimerRef.current);
        liveCountTimerRef.current = setTimeout(() => {
          setLiveWordCount({ documentId: id, count });
        }, 500);
      }
    },
    [id, setLiveWordCount]
  );

  const handleEditToolbarDialog = useCallback(() => {
    setDialog({ activeDialog: DIALOG.EDITOR_TOOLBAR });
  }, [setDialog]);

  useUserPreferences();
  useToolbarSettingsSync(userId, enabledTools);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (doc) {
      setCurrentDocument({
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        content: doc.content,
        wordCount: doc.wordCount,
      });
    }
  }, [doc, setCurrentDocument]);

  if (isLoading) {
    return (
      <div className="flex h-64 flex-1 items-center justify-center text-gray-500">
        Loading document...
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex h-64 flex-1 items-center justify-center text-red-500">
        {error instanceof Error ? error.message : 'Document not found'}
      </div>
    );
  }

  return (
    <DocumentLayout onSave={saveNow}>
      <MainEditor
        key={doc.id}
        handleEditToolbarDialog={handleEditToolbarDialog}
        enabledTools={enabledTools}
        isDialogOpen={isDialogOpen}
        initialContent={doc.content}
        discussionData={discussionData}
        onContentChange={handleContentChange}
        onWordCountChange={handleWordCountChange}
      >
        <EditorToolbarDialog />
      </MainEditor>
    </DocumentLayout>
  );
}
