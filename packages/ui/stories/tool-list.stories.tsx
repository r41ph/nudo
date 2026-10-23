import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SidebarProvider } from '@ui/components/ui/sidebar';
import { ToolList } from '@web/features/sidebar/components/tool-list';

const meta = {
  title: 'Sidebar/ToolList',
  component: ToolList,
  parameters: {
    layout: 'centered',
    route: '/project/northwater/document/chapter-1',
  },
  decorators: [
    (Story, { parameters }) => (
      <MemoryRouter initialEntries={[parameters.route]}>
        <Routes>
          <Route
            path="/project/:projectId/*"
            element={
              <SidebarProvider>
                <div className="w-[263px] bg-sidebar">
                  <Story />
                </div>
              </SidebarProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ToolList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PlotActive: Story = {
  parameters: { route: '/project/northwater/plot' },
};

export const Dark: Story = {
  decorators: [
    (Story) => (
      <div className="dark bg-background p-4">
        <Story />
      </div>
    ),
  ],
};
