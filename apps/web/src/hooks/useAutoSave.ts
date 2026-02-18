import { useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { UPDATE_DOCUMENT_CONTENT } from '@web/graphql/mutations';
import { graphqlClient } from '@web/lib/graphql-client';
import { queryClient } from '@web/lib/query-client';
import { saveStatusAtom, lastSavedAtom } from '@web/state/save-status.atom';

export function useAutoSave(documentId: string | null) {
  const setSaveStatus = useSetAtom(saveStatusAtom);
  const setLastSaved = useSetAtom(lastSavedAtom);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<unknown[]>([]);

  const { mutateAsync: updateContent } = useMutation({
    mutationFn: (variables: { docId: string; newContent: unknown[] }) =>
      graphqlClient.request(UPDATE_DOCUMENT_CONTENT, variables),
  });

  const save = useCallback(
    async (content: unknown[]) => {
      if (!documentId) return;
      setSaveStatus('saving');
      try {
        await updateContent({ docId: documentId, newContent: content });
        queryClient.invalidateQueries({ queryKey: ['document', documentId] });
        setSaveStatus('saved');
        setLastSaved(new Date());
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('error');
      }
    },
    [documentId, updateContent, setSaveStatus, setLastSaved]
  );

  const scheduleAutoSave = useCallback(
    (content: unknown[]) => {
      latestContentRef.current = content;
      setSaveStatus('idle');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        save(latestContentRef.current);
      }, 2500);
    },
    [save, setSaveStatus]
  );

  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    save(latestContentRef.current);
  }, [save]);

  return { scheduleAutoSave, saveNow };
}
