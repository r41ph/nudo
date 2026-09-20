import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { Sidebar, SidebarProvider } from '@ui/components/ui/sidebar';
import { ProjectHeader } from '@web/features/sidebar/components/project-header';
import { SIDEBAR_WIDTH } from '@web/features/sidebar/sidebar.constants';

const sidebarStyle = { '--sidebar-width': SIDEBAR_WIDTH } as CSSProperties;

const meta = {
  title: 'Sidebar/ProjectHeader',
  component: ProjectHeader,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <SidebarProvider style={sidebarStyle}>
        <Sidebar collapsible="none" className="px-4 pt-6 pb-5">
          <Story />
        </Sidebar>
      </SidebarProvider>
    ),
  ],
} satisfies Meta<typeof ProjectHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: 'Northwater' },
};

export const Dark: Story = {
  args: { name: 'Northwater' },
  decorators: [
    (Story) => (
      <div className="dark bg-background">
        <Story />
      </div>
    ),
  ],
};
