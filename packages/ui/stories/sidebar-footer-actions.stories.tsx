import type { Meta, StoryObj, Decorator } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SidebarProvider } from '@ui/components/ui/sidebar';
import { userAtom } from '@web/features/auth/state/auth.store';
import { themeAtom, type Theme } from '@web/shared/state/theme.atom';
import { SidebarFooterActions } from '@web/features/sidebar/components/sidebar-footer-actions';

function createStoryStore(theme: Theme = 'light') {
  const store = createStore();
  store.set(userAtom, {
    id: 'u1',
    email: 'ralph@rgalan.es',
    displayName: null,
  });
  store.set(themeAtom, theme);
  return store;
}

// Seeded so the word counts render without a network.
function createStoryQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  queryClient.setQueryData(['documents'], {
    allDocuments: { nodes: [{ id: 'd1', wordCount: 45 }] },
  });
  return queryClient;
}

const meta = {
  title: 'Sidebar/SidebarFooterActions',
  component: SidebarFooterActions,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <QueryClientProvider client={createStoryQueryClient()}>
        <MemoryRouter>
          <SidebarProvider>
            <div className="w-[263px] bg-sidebar pt-64">
              <Story />
            </div>
          </SidebarProvider>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof SidebarFooterActions>;

export default meta;
type Story = StoryObj<typeof meta>;

function withTheme(theme: Theme): Decorator {
  return function WithTheme(Story) {
    return (
      <JotaiProvider store={createStoryStore(theme)}>
        <Story />
      </JotaiProvider>
    );
  };
}

const openMenu: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.click(
    canvas.getByRole('button', { name: 'Account: ralph@rgalan.es' })
  );
};

export const Default: Story = { decorators: [withTheme('light')] };

export const AccountMenuOpen: Story = {
  decorators: [withTheme('light')],
  play: openMenu,
};

export const AccountMenuOpenDark: Story = {
  decorators: [
    withTheme('dark'),
    (Story) => (
      <div className="dark bg-background">
        <Story />
      </div>
    ),
  ],
  play: openMenu,
};
