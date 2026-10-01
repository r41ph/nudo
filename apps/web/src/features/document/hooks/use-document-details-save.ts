import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { UPDATE_DOCUMENT_DETAILS } from '@web/features/document/api/document.api';
import { DETAILS_DEBOUNCE_MS } from '@web/features/document/constants/inspector.constants';
import type { DocumentDetails } from '@web/features/document/document.types';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { queryClient } from '@web/shared/lib/query-client';
import type { NodeStatus } from '@web/shared/types/outline.types';

type DetailsPatch = Partial<
  Pick<DocumentDetails, 'title' | 'status' | 'summary' | 'pov'>
>;

export type DetailsSaveState = 'idle' | 'saving' | 'saved' | 'error';

type SavedDetails = Pick<
  DocumentDetails,
  'id' | 'title' | 'status' | 'summary' | 'pov' | 'updatedAt'
>;

interface UpdateDetailsResponse {
  updateDocumentById: { document: SavedDetails | null } | null;
}

type CachedDocument =
  | { documentById: (SavedDetails & Record<string, unknown>) | null }
  | undefined;

// A plain function rather than useMutation: the flush on unmount (closing the
// panel, switching documents) has to complete after the component is gone, so
// the failure toast lives here too.
async function saveDetails(id: string, patch: DetailsPatch): Promise<void> {
  try {
    const res = await graphqlClient.request<UpdateDetailsResponse>(
      UPDATE_DOCUMENT_DETAILS,
      { id, patch }
    );
    const saved = res.updateDocumentById?.document;
    // PostGraphile answers a patch on a deleted or foreign row with null.
    if (!saved) throw new Error('Document not found');

    // Only this hook's fields: editor autosave owns content and word count.
    queryClient.setQueryData<CachedDocument>(['document', id], (old) => {
      if (!old?.documentById) return old;
      return {
        ...old,
        documentById: {
          ...old.documentById,
          title: saved.title,
          status: saved.status,
          summary: saved.summary,
          pov: saved.pov,
          updatedAt: saved.updatedAt,
        },
      };
    });
    queryClient.invalidateQueries({ queryKey: ['outline'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  } catch (error) {
    toast.error('Could not save details — try again.', {
      id: 'inspector-save-error',
    });
    throw error;
  }
}

export function useDocumentDetailsSave(details: DocumentDetails) {
  const { id } = details;
  const [title, setTitle] = useState(details.title);
  const [status, setStatusValue] = useState(details.status);
  const [summary, setSummaryValue] = useState(details.summary);
  const [pov, setPovValue] = useState(details.pov);
  const [saveState, setSaveState] = useState<DetailsSaveState>('idle');

  const savedTitleRef = useRef(details.title);
  const pendingRef = useRef<DetailsPatch>({});
  const lastPatchRef = useRef<DetailsPatch>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Chained so patches reach the server in the order they were made.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  // Only the newest request settles the state: an earlier one finishing must
  // not show Saved while a later one is still on its way.
  const latestRef = useRef(0);

  const enqueue = useCallback(
    (patch: DetailsPatch) => {
      const run = queueRef.current.then(() => saveDetails(id, patch));
      queueRef.current = run.catch(() => undefined);
      return run;
    },
    [id]
  );

  // Sends whatever is pending plus `extra`, at once.
  const send = useCallback(
    (extra: DetailsPatch = {}) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      const patch = { ...pendingRef.current, ...extra };
      pendingRef.current = {};
      if (Object.keys(patch).length === 0) return;

      lastPatchRef.current = patch;
      const request = ++latestRef.current;
      setSaveState('saving');
      enqueue(patch).then(
        () => {
          if (request === latestRef.current) setSaveState('saved');
        },
        () => {
          if (request === latestRef.current) setSaveState('error');
        }
      );
    },
    [enqueue]
  );

  const schedule = useCallback(
    (field: 'summary' | 'pov', value: string) => {
      pendingRef.current = { ...pendingRef.current, [field]: value };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => send(), DETAILS_DEBOUNCE_MS);
    },
    [send]
  );

  const commitTitle = useCallback(() => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(savedTitleRef.current);
      return;
    }
    setTitle(trimmed);
    if (trimmed === savedTitleRef.current) return;
    savedTitleRef.current = trimmed;
    send({ title: trimmed });
  }, [title, send]);

  const setStatus = useCallback(
    (next: NodeStatus | null) => {
      setStatusValue(next);
      send({ status: next });
    },
    [send]
  );

  const setSummary = useCallback(
    (value: string) => {
      setSummaryValue(value);
      schedule('summary', value);
    },
    [schedule]
  );

  const setPov = useCallback(
    (value: string) => {
      setPovValue(value);
      schedule('pov', value);
    },
    [schedule]
  );

  const flush = useCallback(() => send(), [send]);

  // Newer typing wins over the values in the failed patch.
  const retry = useCallback(() => {
    pendingRef.current = { ...lastPatchRef.current, ...pendingRef.current };
    send();
  }, [send]);

  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [flush]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const patch = pendingRef.current;
      pendingRef.current = {};
      if (Object.keys(patch).length === 0) return;
      // Nothing is left to show a state on; saveDetails has already toasted
      // the failure.
      enqueue(patch).catch(() => undefined);
    },
    [enqueue]
  );

  return {
    title,
    setTitle,
    commitTitle,
    status,
    setStatus,
    summary,
    setSummary,
    pov,
    setPov,
    saveState,
    retry,
    flush,
  };
}
