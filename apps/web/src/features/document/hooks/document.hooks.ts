import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useQuery } from '@tanstack/react-query';
import {
  currentDocumentAtom,
  liveWordCountAtom,
} from '@web/features/document/state/document.store';
import {
  GET_DOCUMENTS,
  documentsQueryKey,
} from '@web/features/document/api/document.api';
import { isAuthenticatedAtom } from '@web/features/auth/state/auth.store';
import { useProjectId } from '@web/shared/hooks/use-project-id';
import { graphqlClient } from '@web/shared/lib/graphql-client';

type DocumentNode = { id: string; wordCount: number };

// Derived so subscribers re-render on ID changes only, not on every keystroke.
const activeDocIdAtom = selectAtom(
  currentDocumentAtom,
  (doc) => doc?.id ?? null
);

export function useWordCount(documentId?: string): number {
  const activeDocId = useAtomValue(activeDocIdAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  // liveWordCountAtom is written at most every 500ms (debounced at write side)
  const liveWordCount = useAtomValue(liveWordCountAtom);
  const projectId = useProjectId();

  const { data } = useQuery({
    queryKey: documentsQueryKey(projectId),
    queryFn: () =>
      graphqlClient.request<{ allDocuments: { nodes: DocumentNode[] } }>(
        GET_DOCUMENTS,
        { projectId }
      ),
    // The sidebar mounts before the redirect to /login; an anonymous request
    // succeeds with an empty list and would be served from cache after login.
    enabled: isAuthenticated && !!projectId,
  });

  const activeLiveCount =
    liveWordCount !== null && liveWordCount.documentId === activeDocId
      ? liveWordCount.count
      : null;

  const allDocs = useMemo(() => data?.allDocuments?.nodes ?? [], [data]);

  const total = useMemo(
    () =>
      allDocs.reduce((sum, doc) => {
        const count =
          doc.id === activeDocId && activeLiveCount !== null
            ? activeLiveCount
            : doc.wordCount;
        return sum + count;
      }, 0),
    [allDocs, activeDocId, activeLiveCount]
  );

  if (documentId !== undefined) {
    if (documentId === activeDocId && activeLiveCount !== null) {
      return activeLiveCount;
    }
    return allDocs.find((d) => d.id === documentId)?.wordCount ?? 0;
  }

  return total;
}
