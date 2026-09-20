import { useAtomValue } from 'jotai';
import { useWordCount } from '@web/features/document/hooks/document.hooks';
import { useDailyWordDelta } from '@web/features/document/hooks/use-daily-word-delta';
import {
  currentDocumentAtom,
  liveWordCountAtom,
} from '@web/features/document/state/document.store';

export function WordCounts() {
  const currentDocument = useAtomValue(currentDocumentAtom);
  const liveWordCount = useAtomValue(liveWordCountAtom);
  const total = useWordCount();

  const docId = currentDocument?.id ?? null;
  const docCount =
    liveWordCount?.documentId === docId
      ? liveWordCount.count
      : (currentDocument?.wordCount ?? 0);
  const delta = useDailyWordDelta(docId, docCount);

  return (
    <div className="px-2.5 text-[11.5px] leading-5 text-muted-foreground tabular-nums">
      <p>{delta.toLocaleString()} Today words</p>
      <p>{total.toLocaleString()} Total words</p>
    </div>
  );
}
