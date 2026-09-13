import { useEffect, useState } from 'react';

const BASELINE_PREFIX = 'nudo:word-baseline:';
const todayKey = (): string => new Date().toISOString().slice(0, 10);
const storageKey = (docId: string): string =>
  `${BASELINE_PREFIX}${docId}:${todayKey()}`;

// Keeps the key space bounded. Iterates backwards because removeItem reindexes
// the store.
function pruneStaleBaselines(today: string): void {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BASELINE_PREFIX) && !key.endsWith(`:${today}`)) {
      localStorage.removeItem(key);
    }
  }
}

// Falls back to the current count if storage is unavailable (private mode,
// quota): the delta is a nicety, never load-blocking.
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

// Clamped at 0 so deletions never show a negative delta.
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
    // The baseline is the first count seen today, so `count` is deliberately
    // not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  if (baseline === null) return 0;
  return Math.max(0, currentCount - baseline);
}
