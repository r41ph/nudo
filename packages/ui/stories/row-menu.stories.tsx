import type { Meta, StoryObj } from '@storybook/react-vite';
import { RowMenu } from '@web/features/outline/components/row-menu';

const noop = () => {};

const meta = {
  title: 'Outline/RowMenu',
  component: RowMenu,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      // The trigger's glyph is hidden until the row is hovered, so the story
      // sits inside a stand-in row to make the rest state reproducible.
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
    onSetStatus: noop,
    onAddChild: noop,
    onDelete: noop,
  },
} satisfies Meta<typeof RowMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every row gets the same four actions, whatever its kind. */
export const DocumentRow: Story = {};

export const FolderRow: Story = {
  args: { title: 'Chapter One' },
};

export const WithStatusSet: Story = {
  args: { title: 'Chapter One', status: 'drafting' },
};

/** The trigger stays lit while the menu is open. */
export const MenuOpen: Story = {
  args: { title: 'Chapter One' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Actions for Chapter One' })
    );
  },
};
