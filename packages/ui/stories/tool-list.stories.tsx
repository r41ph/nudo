import type { Meta, StoryObj } from '@storybook/react-vite';
import { SidebarProvider } from '@ui/components/ui/sidebar';
import { ToolList } from '@web/features/sidebar/components/tool-list';

const meta = {
  title: 'Sidebar/ToolList',
  component: ToolList,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <SidebarProvider>
        <div className="w-[263px] bg-sidebar">
          <Story />
        </div>
      </SidebarProvider>
    ),
  ],
} satisfies Meta<typeof ToolList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = {
  decorators: [
    (Story) => (
      <div className="dark bg-background p-4">
        <Story />
      </div>
    ),
  ],
};
