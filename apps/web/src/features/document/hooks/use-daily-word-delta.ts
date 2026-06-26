import { useEffect, useState } from 'react';

const BASELINE_PREFIX = 'nudo:word-baseline:';
const todayKey = (): string => new Date().toISOString().slice(0, 10);
const storageKey = (docId: string): string =>
  `${BASELINE_PREFIX}${docId}:${todayKey()}`;

/**
 * Drops baseline entries from previous days so the key space stays bounded
 * (otherwise every doc opened on a distinct day would leave a key behind
 * forever). Iterates backwards because removeItem reindexes the store.
 */
function pruneStaleBaselines(today: string): void {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BASELINE_PREFIX) && !key.endsWith(`:${today}`)) {
      localStorage.removeItem(key);
    }
  }
}

/**
 * The word count a document started today at. Recorded once per document per
 * calendar day in localStorage the first time the document is seen that day;
 * subsequent reads return that stored baseline so the "+N today" delta is
 * stable across reloads. Falls back to the current count if storage is
 * unavailable (private mode, quota) — the delta is a nicety, never load-blocking.
 */
function readDailyBaseline(docId: string, currentCount: number): number {
  try {
    pruneStaleBaselines(todayKey());
    const raw = localStorage.getItem(storageKey(docId));
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
    localStorage.setItem(storageKey(docId), String(currentCount));
    return currentCount;
  } catch {
    return currentCount;
  }
}

/**
 * Words written in the open document since the start of today. Clamped at 0 so
 * deletions never show a negative delta. The baseline is captured once when the
 * document opens (not re-read as you type) so the count only ever grows with
 * new writing.
 */
export function useDailyWordDelta(
  docId: string | null,
  currentCount: number
): number {
  const [baseline, setBaseline] = useState<number | null>(null);

  useEffect(() => {
    if (!docId) {
      setBaseline(null);
      return;
    }
    setBaseline(readDailyBaseline(docId, currentCount));
    // Baseline is the first count seen today — intentionally not re-run on count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  if (baseline === null) return 0;
  return Math.max(0, currentCount - baseline);
}
