import type { Meta, StoryObj } from '@storybook/react-vite';
import { TopBar } from '@web/layouts/components/top-bar';
import { ThemeToggle } from '@web/shared/components/theme-toggle';

// The global app chrome (wordmark + right-hand slot) for NON-editor pages —
// e.g. a future projects/settings list, or logged-out pages. The editor route
// hides it in favour of EditorTopBar (see AppLayout `showTopBar`). It's mounted
// in `AppLayout` and currently only reachable on the no-documents empty state,
// so this story is the primary place it stays visible — reuse/extend it here
// rather than building a new header when those pages land.
const meta = {
  title: 'Layout/TopBar',
  component: TopBar,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// How AppLayout renders it: wordmark on the left, theme switch in the slot.
export const WithThemeToggle: Story = {
  render: () => (
    <TopBar>
      <ThemeToggle />
    </TopBar>
  ),
};

// Bare wordmark, no right-hand content (e.g. logged-out pages).
export const WordmarkOnly: Story = {};
