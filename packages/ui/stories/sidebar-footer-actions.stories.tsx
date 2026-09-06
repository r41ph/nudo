import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { SidebarProvider } from '@ui/components/ui/sidebar';
import { userAtom } from '@web/features/auth/state/auth.store';
import { SidebarFooterActions } from '@web/features/sidebar/components/sidebar-footer-actions';

const OUTLINE = {
  allDocuments: {
    nodes: [
      {
        id: 'ch1',
        title: 'Chapter One',
        parentId: null,
        position: 0,
        kind: 'folder',
        status: null,
        wordCount: 43,
      },
      {
        id: 'doc1',
        title: 'Welcome Document',
        parentId: 'ch1',
        position: 0,
        kind: 'document',
        status: null,
        wordCount: 43,
      },
    ],
  },
};

/** Seeds the outline cache so the button can name its scope without a network. */
function createStoryQueryClient() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  client.setQueryData(['outline'], OUTLINE);
  return client;
}

function createStoryStore() {
  const store = createStore();
  store.set(userAtom, {
    id: 'u1',
    email: 'ralph@rgalan.es',
    displayName: null,
  });
  return store;
}

const meta = {
  title: 'Sidebar/SidebarFooterActions',
  component: SidebarFooterActions,
  parameters: { layout: 'centered' },
  decorators: [
    (Story, ctx) => (
      <JotaiProvider store={createStoryStore()}>
        <QueryClientProvider client={createStoryQueryClient()}>
          <MemoryRouter
            initialEntries={[(ctx.parameters.route as string) ?? '/']}
          >
            <SidebarProvider>
              <div className="w-[244px] bg-sidebar">
                <Routes>
                  <Route path="/document/:id" element={<Story />} />
                  <Route path="*" element={<Story />} />
                </Routes>
              </div>
            </SidebarProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </JotaiProvider>
    ),
  ],
} satisfies Meta<typeof SidebarFooterActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing open — the button creates at the root. */
export const AtRoot: Story = {};

/** A document inside "Chapter One" is open, so the button names it. */
export const ScopedToChapter: Story = {
  parameters: { route: '/document/doc1' },
};

/** The chapter itself is open — it is its own scope. */
export const ChapterOpen: Story = {
  parameters: { route: '/document/ch1' },
};

export const AccountMenuOpen: Story = {
  parameters: { route: '/document/doc1' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Account: ralph@rgalan.es' })
    );
  },
};
