import type { Meta, StoryObj } from '@storybook/react-vite';
import { TopBar } from '@web/layouts/components/top-bar';
import { ThemeToggle } from '@web/shared/components/theme-toggle';

// Only reachable in the app on the no-documents state, so this story is where
// it stays visible; extend it for future non-editor pages rather than adding
// another header.
const meta = {
  title: 'Layout/TopBar',
  component: TopBar,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithThemeToggle: Story = {
  render: () => (
    <TopBar>
      <ThemeToggle />
    </TopBar>
  ),
};

export const WordmarkOnly: Story = {};
