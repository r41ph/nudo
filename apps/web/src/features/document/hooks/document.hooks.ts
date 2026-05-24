import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useQuery } from '@tanstack/react-query';
import {
  currentDocumentAtom,
  liveWordCountAtom,
} from '@web/features/document/state/document.store';
import { GET_DOCUMENTS } from '@web/features/document/api/document.api';
import { graphqlClient } from '@web/shared/lib/graphql-client';

type DocumentNode = { id: string; wordCount: number };

// Module-level derived atom: re-renders only when the active document ID changes,
// not on title/content/wordCount changes.
const activeDocIdAtom = selectAtom(
  currentDocumentAtom,
  (doc) => doc?.id ?? null
);

export function useWordCount(documentId?: string): number {
  const activeDocId = useAtomValue(activeDocIdAtom);
  // liveWordCountAtom is written at most every 500ms (debounced at write side)
  const liveWordCount = useAtomValue(liveWordCountAtom);

  const { data } = useQuery({
    queryKey: ['documents'],
    queryFn: () =>
      graphqlClient.request<{ allDocuments: { nodes: DocumentNode[] } }>(
        GET_DOCUMENTS
      ),
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
