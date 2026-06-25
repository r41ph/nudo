import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@ui/components/ui/button';
import { Icon } from '@ui/components/icon/icon';
import { AddNodeMenu } from '@web/features/outline/components/add-node-menu';

const meta = {
  title: 'Outline/AddNodeMenu',
  component: AddNodeMenu,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="rounded-md bg-sidebar p-6">
        <Story />
      </div>
    ),
  ],
  args: { onAdd: () => {} },
} satisfies Meta<typeof AddNodeMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

// Pick the kind to create: Document / Folder / Separator. Same menu everywhere.
export const Default: Story = {
  args: {
    trigger: (
      <Button variant="ghost" size="icon-sm" aria-label="Add">
        <Icon name="plus" className="h-4 w-4" />
      </Button>
    ),
  },
};

export const FooterTrigger: Story = {
  args: {
    align: 'start',
    trigger: (
      <Button className="gap-2 text-xs font-semibold uppercase tracking-widest">
        <Icon name="plus" className="h-3.5 w-3.5" />
        New
      </Button>
    ),
  },
};
