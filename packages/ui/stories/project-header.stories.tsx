import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar, SidebarProvider } from '@ui/components/ui/sidebar';
import { ProjectHeader } from '@web/features/sidebar/components/project-header';

function createStoryQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

const meta = {
  title: 'Sidebar/ProjectHeader',
  component: ProjectHeader,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <QueryClientProvider client={createStoryQueryClient()}>
        <SidebarProvider>
          <Sidebar collapsible="none">
            <Story />
          </Sidebar>
        </SidebarProvider>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof ProjectHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: 'Northwater' },
};
