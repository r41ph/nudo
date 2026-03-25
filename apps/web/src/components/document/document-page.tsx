import { useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { GET_DOCUMENT } from '@web/graphql/queries';
import { graphqlClient } from '@web/lib/graphql-client';
import { currentDocumentAtom } from '@web/state/document.atom';
import { liveWordCountAtom } from '@web/state/live-word-count.atom';
import { enabledToolsAtom } from '@web/state/toolbar.atom';
import { dialogAtom, isToolbarDialogOpenAtom } from '@web/state/dialog.atom';
import { isAuthenticatedAtom, userIdAtom } from '@web/state/auth.atom';
import { DocumentLayout } from '@web/components/layout/document-layout';
import { MainEditor } from '@writing-app/ui/src/components/main-editor/main-editor';
import { EditorToolbarDialog } from '@web/components/toolbar-dialog/toolbar-dialog';
import { useAutoSave } from '@web/hooks/useAutoSave';
import { useToolbarSettingsSync } from '@web/hooks/useToolbarSettingsSync';
import { useUserPreferences } from '@web/hooks/useUserPreferences';
import { isValidUuid } from '@web/lib/uuid';
import type { Value } from 'platejs';

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
    queryFn: () => graphqlClient.request<GetDocumentResponse>(GET_DOCUMENT, { id }),
    enabled: isValidId && isAuthenticated,
  });

  const doc = data?.documentById;

  const { scheduleAutoSave, saveNow } = useAutoSave(id || null);

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
        onContentChange={handleContentChange}
        onWordCountChange={handleWordCountChange}
      >
        <EditorToolbarDialog />
      </MainEditor>
    </DocumentLayout>
  );
}
