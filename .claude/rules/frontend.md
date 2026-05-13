---
description: React frontend architecture and conventions for apps/web
globs: 'apps/web/src/**'
---

## Feature boundaries

Features are self-contained. Never import from another feature's internals.

- Bad: `import { X } from '@web/features/document/hooks/use-document'` (used inside the `folder` feature)
- Good: move the shared code to `src/shared/` first, then import from there

## Library version pins

These libraries have stale training data — always query context7 before touching:

- **Plate.js v52** — editor API changes significantly between versions
- **React Router v7** — loaders/actions API differs from v6
- **Tailwind CSS v4** — several class names changed from v3

## GraphQL

No codegen — all queries and mutations are raw strings in `features/<name>/api/`. The shared client at `@web/shared/lib/graphql-client.ts` handles JWT headers. Never instantiate a new GraphQL client inside a feature.
