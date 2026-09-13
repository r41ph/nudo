import { useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { UPDATE_DOCUMENT_CONTENT } from '@web/features/document/api/document.api';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { queryClient } from '@web/shared/lib/query-client';
import {
  saveStatusAtom,
  lastSavedAtom,
} from '@web/shared/state/save-status.atom';

type UpdateContentResponse = {
  updateDocumentContent: {
    document: {
      id: string;
      content: unknown[];
      plainText: string;
      wordCount: number;
      updatedAt: string;
    } | null;
  };
};

type DocumentQueryData = {
  documentById: {
    content: unknown[];
    plainText: string;
    wordCount: number;
    updatedAt: string;
  } | null;
} | null;

export function useAutoSave(documentId: string | null) {
  const setSaveStatus = useSetAtom(saveStatusAtom);
  const setLastSaved = useSetAtom(lastSavedAtom);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<unknown[]>([]);
  const isDirtyRef = useRef(false);

  const { mutateAsync: updateContent } = useMutation({
    mutationFn: (variables: { docId: string; newContent: unknown[] }) =>
      graphqlClient.request<UpdateContentResponse>(
        UPDATE_DOCUMENT_CONTENT,
        variables
      ),
    // Without this, navigating away and back within staleTime re-seeds the
    // editor from the load-time snapshot.
    onSuccess: (data, variables) => {
      const updated = data.updateDocumentContent.document;
      if (!updated) return;
      queryClient.setQueryData<DocumentQueryData>(
        ['document', variables.docId],
        (old) => {
          if (!old?.documentById) return old;
          return {
            ...old,
            documentById: {
              ...old.documentById,
              content: updated.content,
              plainText: updated.plainText,
              wordCount: updated.wordCount,
              updatedAt: updated.updatedAt,
            },
          };
        }
      );
    },
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const save = useCallback(
    async (content: unknown[]) => {
      if (!documentId) return;
      isDirtyRef.current = false;
      setSaveStatus('saving');
      try {
        await updateContent({ docId: documentId, newContent: content });
        setSaveStatus('saved');
        setLastSaved(new Date());
      } catch (err) {
        isDirtyRef.current = true;
        console.error('Auto-save failed:', err);
        setSaveStatus('error');
      }
    },
    [documentId, updateContent, setSaveStatus, setLastSaved]
  );

  const scheduleAutoSave = useCallback(
    (content: unknown[]) => {
      latestContentRef.current = content;
      isDirtyRef.current = true;
      setSaveStatus('unsaved');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        save(latestContentRef.current);
      }, 2500);
    },
    [save, setSaveStatus]
  );

  const saveNow = useCallback(() => {
    if (!isDirtyRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    save(latestContentRef.current);
  }, [save]);

  return { scheduleAutoSave, saveNow };
}
