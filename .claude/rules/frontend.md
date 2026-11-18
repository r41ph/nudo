---
description: React frontend architecture and conventions for apps/web
paths:
  - 'apps/web/src/**'
---

## Feature boundaries

Features are self-contained. Never import from another feature's internals.

- Bad: `import { X } from '@web/features/document/hooks/use-document'` (used inside the `folder` feature)
- Good: move the shared code to `src/shared/` first, then import from there

## Library APIs

Before writing or changing code that uses a third-party library's API, look it up in context7 for the version `apps/web/package.json` installs. APIs change between versions, and training data is often out of date or for another version.

## GraphQL

No codegen — all queries and mutations are raw strings in `features/<name>/api/`. The shared client at `@web/shared/lib/graphql-client.ts` handles JWT headers. Never instantiate a new GraphQL client inside a feature.

## Error handling

Never swallow errors or hide them behind silent fallbacks.

- Surface failures to the user — render the TanStack Query `isError`/`error` state, don't show stale or empty content as if the request succeeded.
- Mutations that can fail visibly (autosave, settings sync) must reflect the failure in the UI (e.g. the SaveBar), not just `console.error`.
- Don't `catch` and continue with a default value unless the fallback is genuinely correct behavior; if you do, comment why.
