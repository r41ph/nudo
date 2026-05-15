---
description: Vitest and MSW testing conventions
globs: 'apps/web/src/**/*.test.{ts,tsx}, apps/web/src/test/**'
---

## Scope

This rule applies to **web tests only**. API tests (`apps/api`) use direct unit testing and never use MSW.

Run only tests for the files you changed — never the full suite unless explicitly asked:

```bash
pnpm vitest run <partial-filename>   # matches against the full file path
```

## MSW

All GraphQL requests are intercepted at the network level — tests never call the real API.

- Handlers: `apps/web/src/test/mocks/`
- Test setup (`src/test/setup.ts`) starts MSW before all tests and resets handlers between tests
- To override a handler in a single test: call `server.use(http.post(...))` inside the test body — it resets automatically after

## Conventions

- Tests live co-located with their component: `my-component.test.tsx` next to `my-component.tsx`
- Use Testing Library semantic queries (`getByRole`, `findByText`) — avoid `getByTestId` unless no semantic alternative works
- Test observable behavior, not implementation details
- Never mock modules when MSW can intercept the network request instead
