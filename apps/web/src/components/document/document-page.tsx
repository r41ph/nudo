import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { GET_DOCUMENT } from '@web/graphql/queries';
import { graphqlClient } from '@web/lib/graphql-client';
import { currentDocumentAtom } from '@web/state/document.atom';
import { enabledToolsAtom } from '@web/state/toolbar.atom';
import { dialogAtom } from '@web/state/dialog.atom';
import { DIALOG } from '@web/constants/dialog.constants';
import { isAuthenticatedAtom } from '@web/state/auth.atom';
import { Layout } from '@web/components/layout/layout';
import { MainEditor } from '@writing-app/ui/src/components/main-editor/main-editor';
import { EditorToolbarDialog } from '@web/components/toolbar-dialog/toolbar-dialog';
import { SaveBar } from '@web/components/save-bar/save-bar';
import { useAutoSave } from '@web/hooks/useAutoSave';
import { useToolbarSettingsSync } from '@web/hooks/useToolbarSettingsSync';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DocumentData = any;

export function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const [dialogState, setDialog] = useAtom(dialogAtom);
  const [enabledTools, setEnabledTools] = useAtom(enabledToolsAtom);
  const setCurrentDocument = useSetAtom(currentDocumentAtom);
  const isDialogOpen = dialogState.activeDialog === DIALOG.EDITOR_TOOLBAR;

  const { data, isLoading, error } = useQuery({
    queryKey: ['document', id],
    queryFn: () =>
      graphqlClient.request<DocumentData>(GET_DOCUMENT, { id }),
    enabled: !!id && isAuthenticated,
  });

  const doc = data?.documentById;
  const settings = doc?.documentSettingsByDocumentId?.nodes?.[0];

  const { scheduleAutoSave, saveNow } = useAutoSave(id || null);
  useToolbarSettingsSync(settings?.id || null, enabledTools);

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
        settingsId: settings?.id || null,
      });
      if (settings?.enabledTools) {
        setEnabledTools(settings.enabledTools);
      }
    }
  }, [doc, settings, setCurrentDocument, setEnabledTools]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center text-gray-500">
          Loading document...
        </div>
      </Layout>
    );
  }

  if (error || !doc) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center text-red-500">
          {error instanceof Error ? error.message : 'Document not found'}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SaveBar onSave={saveNow} />
      <MainEditor
        handleEditToolbarDialog={() => {
          setDialog({ activeDialog: DIALOG.EDITOR_TOOLBAR });
        }}
        enabledTools={enabledTools}
        isDialogOpen={isDialogOpen}
        initialContent={doc.content}
        onContentChange={scheduleAutoSave}
      >
        <EditorToolbarDialog />
      </MainEditor>
    </Layout>
  );
}
