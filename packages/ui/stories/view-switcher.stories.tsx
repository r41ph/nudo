import { useLayoutEffect, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ViewSwitcher } from '@web/features/sidebar/components/view-switcher';

const meta = {
  title: 'Sidebar/ViewSwitcher',
  component: ViewSwitcher,
  parameters: {
    layout: 'centered',
    route: '/project/northwater/document/chapter-1',
  },
  decorators: [
    (Story, { parameters }) => (
      <MemoryRouter initialEntries={[parameters.route]}>
        <Routes>
          {['/project/:projectId/*', '*'].map((path) => (
            <Route
              key={path}
              path={path}
              element={
                <div className="h-[220px] w-[263px] bg-sidebar p-2">
                  <Story />
                </div>
              }
            />
          ))}
        </Routes>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ViewSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

const openMenu: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole('button', { name: /^View: / }));
};

export const StoryView: Story = { name: 'Story' };

export const Plot: Story = {
  parameters: { route: '/project/northwater/plot' },
};

export const MenuOpen: Story = { play: openMenu };

export const NoProject: Story = {
  parameters: { route: '/' },
  play: openMenu,
};

// The menu portals to <body>, outside any wrapper, so dark has to sit on
// <html> as it does in the app.
function DarkRoot({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    document.documentElement.classList.add('dark');
    return () => document.documentElement.classList.remove('dark');
  }, []);
  return <div className="bg-background p-4">{children}</div>;
}

export const Dark: Story = {
  decorators: [
    (Story) => (
      <DarkRoot>
        <Story />
      </DarkRoot>
    ),
  ],
  play: openMenu,
};
