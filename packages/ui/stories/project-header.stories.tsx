import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Sidebar, SidebarProvider } from '@ui/components/ui/sidebar';
import { ProjectHeaderView } from '@web/features/sidebar/components/project-header';
import { SIDEBAR_WIDTH } from '@web/features/sidebar/sidebar.constants';

const sidebarStyle = { '--sidebar-width': SIDEBAR_WIDTH } as CSSProperties;

const meta = {
  title: 'Sidebar/ProjectHeader',
  component: ProjectHeaderView,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/project/northwater/document/chapter-1']}>
        <Routes>
          <Route
            path="/project/:projectId/*"
            element={
              <SidebarProvider style={sidebarStyle}>
                <Sidebar collapsible="none" className="px-4 pt-6 pb-5">
                  <Story />
                </Sidebar>
              </SidebarProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ProjectHeaderView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { title: 'Northwater' },
};

export const Loading: Story = {
  args: { title: undefined, isLoading: true },
};

export const LoadError: Story = {
  args: { title: undefined, isError: true },
};

export const Dark: Story = {
  args: { title: 'Northwater' },
  decorators: [
    (Story) => (
      <div className="dark bg-background">
        <Story />
      </div>
    ),
  ],
};
