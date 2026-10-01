import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMediaQuery } from '@web/shared/hooks/use-media-query';
import { setViewportWidth } from '@web/test/media';

const DESKTOP = '(min-width: 1280px)';

describe('useMediaQuery', () => {
  // The reason this hook exists instead of reusing use-mobile.ts: that one
  // reports false on its first render, which flashes the wrong layout.
  it('is correct on the very first render', () => {
    const seen: boolean[] = [];

    renderHook(() => {
      const matches = useMediaQuery(DESKTOP);
      seen.push(matches);
      return matches;
    });

    expect(seen.every(Boolean)).toBe(true);
  });

  it('follows the viewport across the breakpoint', () => {
    const { result } = renderHook(() => useMediaQuery(DESKTOP));
    expect(result.current).toBe(true);

    act(() => setViewportWidth(1024));
    expect(result.current).toBe(false);

    act(() => setViewportWidth(1280));
    expect(result.current).toBe(true);
  });

  it('switches to a new query', () => {
    const { result, rerender } = renderHook(
      ({ query }) => useMediaQuery(query),
      { initialProps: { query: DESKTOP } }
    );

    rerender({ query: '(max-width: 767px)' });
    expect(result.current).toBe(false);

    act(() => setViewportWidth(700));
    expect(result.current).toBe(true);
  });

  it('stops listening once unmounted', () => {
    const matchMedia = vi.spyOn(window, 'matchMedia');
    const { unmount } = renderHook(() => useMediaQuery(DESKTOP));
    const mql = matchMedia.mock.results[0].value as MediaQueryList;
    const remove = vi.spyOn(mql, 'removeEventListener');

    unmount();

    expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
