import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SidebarProvider } from '@ui/components/ui/sidebar';
import { SidebarFooterActions } from '@web/features/sidebar/components/sidebar-footer-actions';

function createStoryQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
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
            <Story />
          </SidebarProvider>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof SidebarFooterActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
