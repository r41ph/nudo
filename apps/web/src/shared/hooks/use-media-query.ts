import { useCallback, useMemo, useSyncExternalStore } from 'react';

// Reads the query synchronously, so the first render already has the right
// answer; correcting it in an effect would flash the wrong layout on load.
export function useMediaQuery(query: string): boolean {
  const mql = useMemo(() => window.matchMedia(query), [query]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [mql]
  );

  return useSyncExternalStore(subscribe, () => mql.matches);
}
