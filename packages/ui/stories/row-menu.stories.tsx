import type { Meta, StoryObj } from '@storybook/react-vite';
import { RowMenu } from '@web/features/outline/components/row-menu';

const noop = () => {};

const meta = {
  title: 'Outline/RowMenu',
  component: RowMenu,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      // The trigger only reveals on row hover, so it needs a stand-in `group/row`.
      <div className="group/row flex w-[280px] items-center gap-2 rounded-lg bg-sidebar px-2 py-1">
        <span className="flex-1 text-[13.5px] text-prose">
          Welcome Document
        </span>
        <span className="text-[11.5px] tabular-nums text-muted-foreground">
          43
        </span>
        <Story />
      </div>
    ),
  ],
  args: {
    title: 'Welcome Document',
    status: null,
    onRename: noop,
    onOpenDetails: noop,
    onSetStatus: noop,
    onAddChild: noop,
    onDelete: noop,
  },
} satisfies Meta<typeof RowMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DocumentRow: Story = {};

export const FolderRow: Story = {
  args: { title: 'Chapter One' },
};

export const WithStatusSet: Story = {
  args: { title: 'Chapter One', status: 'drafting' },
};

export const MenuOpen: Story = {
  args: { title: 'Chapter One' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Actions for Chapter One' })
    );
  },
};
