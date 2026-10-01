import { useAtomValue } from 'jotai';
import { useWordCount } from '@web/features/document/hooks/document.hooks';
import { useDailyWordDelta } from '@web/features/document/hooks/use-daily-word-delta';
import {
  currentDocumentAtom,
  liveWordCountAtom,
} from '@web/features/document/state/document.store';

function Count({ value, label }: { value: number; label: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="font-semibold text-prose">{value.toLocaleString()}</span>{' '}
      {label}
    </span>
  );
}

export function WordCountStrip() {
  const currentDocument = useAtomValue(currentDocumentAtom);
  const liveWordCount = useAtomValue(liveWordCountAtom);
  const total = useWordCount();

  const docId = currentDocument?.id ?? null;
  const docCount =
    liveWordCount?.documentId === docId
      ? liveWordCount.count
      : (currentDocument?.wordCount ?? 0);
  const today = useDailyWordDelta(docId, docCount);

  return (
    <p
      // Rewritten on every live-count tick (500ms while typing); announcing
      // each one would make the editor unusable with a screen reader.
      aria-live="off"
      className="sticky bottom-0 flex justify-end gap-[18px] bg-background pr-[26px] pb-[18px] text-[11.5px] leading-5 text-muted-foreground tabular-nums"
    >
      <Count value={docCount} label="document" />
      <Count value={today} label="today" />
      <Count value={total} label="total" />
    </p>
  );
}
