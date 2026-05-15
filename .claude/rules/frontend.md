---
description: React frontend architecture and conventions for apps/web
paths:
  - 'apps/web/src/**'
---

## Feature boundaries

Features are self-contained. Never import from another feature's internals.

- Bad: `import { X } from '@web/features/document/hooks/use-document'` (used inside the `folder` feature)
- Good: move the shared code to `src/shared/` first, then import from there

## Always query context7 for library APIs

Training data for third-party libraries is often stale. Always query context7 before touching any third-party library API -- do not rely on memory.

## GraphQL

No codegen — all queries and mutations are raw strings in `features/<name>/api/`. The shared client at `@web/shared/lib/graphql-client.ts` handles JWT headers. Never instantiate a new GraphQL client inside a feature.
