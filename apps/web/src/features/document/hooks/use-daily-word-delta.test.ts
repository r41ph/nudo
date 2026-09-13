import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useDailyWordDelta } from '@web/features/document/hooks/use-daily-word-delta';

const PREFIX = 'nudo:word-baseline:';
const today = (): string => new Date().toISOString().slice(0, 10);
const key = (docId: string, day: string = today()): string =>
  `${PREFIX}${docId}:${day}`;

describe('useDailyWordDelta', () => {
  it('records the baseline and returns 0 the first time a doc is opened today', () => {
    const { result } = renderHook(() => useDailyWordDelta('doc-1', 500));

    expect(result.current).toBe(0);
    expect(localStorage.getItem(key('doc-1'))).toBe('500');
  });

  it('counts words written since the stored baseline', () => {
    localStorage.setItem(key('doc-1'), '500');

    const { result } = renderHook(() => useDailyWordDelta('doc-1', 1112));

    expect(result.current).toBe(612);
  });

  it('clamps to 0 when the count drops below the baseline (deletions)', () => {
    localStorage.setItem(key('doc-1'), '500');

    const { result } = renderHook(() => useDailyWordDelta('doc-1', 300));

    expect(result.current).toBe(0);
  });

  it('returns 0 when no document is open', () => {
    const { result } = renderHook(() => useDailyWordDelta(null, 500));

    expect(result.current).toBe(0);
  });

  it("prunes baselines from previous days but keeps today's", () => {
    localStorage.setItem(key('doc-1', '2000-01-01'), '10'); // stale day
    localStorage.setItem(key('doc-2'), '20'); // today, a different doc

    renderHook(() => useDailyWordDelta('doc-1', 50));

    expect(localStorage.getItem(key('doc-1', '2000-01-01'))).toBeNull();
    expect(localStorage.getItem(key('doc-2'))).toBe('20');
    expect(localStorage.getItem(key('doc-1'))).toBe('50');
  });
});
