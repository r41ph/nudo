import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { within } from 'storybook/test';
import { NoProjects } from '@web/features/project/components/project-redirect';

const meta = {
  title: 'Project/NoProjects',
  component: NoProjects,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <div className="w-[560px]">
            <Story />
          </div>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof NoProjects>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DialogOpen: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Create a project' })
    );
    // The dialog portals to <body>, outside the canvas.
    await within(document.body).findByRole('dialog');
  },
};
