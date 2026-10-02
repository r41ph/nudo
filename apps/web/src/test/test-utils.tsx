import { render, renderHook, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
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
  store?: ReturnType<typeof createStore>;
  // Code that writes to the app's singleton client outside React (the details
  // save) needs the tree to read from that same client.
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: WrapperOptions & Omit<RenderOptions, 'wrapper'>
) {
  const {
    initialRoute = '/',
    store = createStore(),
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options ?? {};

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <JotaiProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[initialRoute]}>
            {children}
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
  const { initialRoute = '/', store = createStore() } = options ?? {};
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <JotaiProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[initialRoute]}>
            {children}
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
