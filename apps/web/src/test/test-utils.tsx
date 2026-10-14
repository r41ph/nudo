import { render, renderHook, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider as JotaiProvider, createStore } from 'jotai';
import type { ReactElement, ReactNode } from 'react';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface WrapperOptions {
  initialRoute?: string;
  // Route pattern to match initialRoute against, so useParams sees it.
  routePath?: string;
  store?: ReturnType<typeof createStore>;
  // Code that writes to the app's singleton client outside React (the details
  // save) needs the tree to read from that same client.
  queryClient?: QueryClient;
}

function withRoute(children: ReactNode, routePath: string | undefined) {
  if (!routePath) return children;
  return (
    <Routes>
      <Route path={routePath} element={children} />
    </Routes>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: WrapperOptions & Omit<RenderOptions, 'wrapper'>
) {
  const {
    initialRoute = '/',
    routePath,
    store = createStore(),
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options ?? {};

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <JotaiProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[initialRoute]}>
            {withRoute(children, routePath)}
          </MemoryRouter>
        </QueryClientProvider>
      </JotaiProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
    store,
  };
}

export function renderHookWithProviders<TResult>(
  hook: () => TResult,
  options?: WrapperOptions
) {
  const {
    initialRoute = '/',
    routePath,
    store = createStore(),
  } = options ?? {};
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <JotaiProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[initialRoute]}>
            {withRoute(children, routePath)}
          </MemoryRouter>
        </QueryClientProvider>
      </JotaiProvider>
    );
  }

  return {
    ...renderHook(hook, { wrapper: Wrapper }),
    queryClient,
    store,
  };
}

export { createStore } from 'jotai';
