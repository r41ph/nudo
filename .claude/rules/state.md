---
description: Jotai and TanStack Query state management patterns
globs: 'apps/web/src/**/state/**, apps/web/src/**/*.atom.ts, apps/web/src/**/*.store.ts'
---

## Jotai

- Shared atoms (used across features): `<name>.atom.ts` in `src/shared/state/`
- Feature state (any size, even a single atom): `<name>.store.ts` in `features/<name>/state/`
- State that must survive page reload: `atomWithStorage` — use sparingly
- Derived/computed values: `atom(get => get(otherAtom))` — never use a useEffect chain to sync two atoms

## TanStack Query

- Global defaults: `staleTime: 60_000`, `retry: 1` — don't override per-query without a specific reason
- After mutations: invalidate with `queryClient.invalidateQueries({ queryKey: [...] })`
- Query keys: define as constants in the feature's `api/` directory

## Hard rules

- Never store API response data in a Jotai atom — use the TanStack Query cache
- Never use TanStack Query for state with no server representation
- Never call `useQueryClient` inside a Jotai atom initializer or setter
