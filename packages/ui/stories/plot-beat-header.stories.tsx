import type { Meta, StoryObj } from '@storybook/react-vite';
import { within } from 'storybook/test';
import { BeatHeader } from '@web/features/plot/components/board/beat-header';
import { PLOT_BEAT_COLUMN_WIDTH } from '@web/features/plot/constants/plot.constants';

const noop = () => {};

const openMenu: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.click(
    canvas.getByRole('button', { name: 'Actions for Inciting incident' })
  );
};

const meta = {
  title: 'Plot/BeatHeader',
  component: BeatHeader,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="bg-background" style={{ width: PLOT_BEAT_COLUMN_WIDTH }}>
        <Story />
      </div>
    ),
  ],
  args: {
    beat: { id: 'b1', name: 'Inciting incident', position: 0 },
    editable: true,
    isFirst: false,
    isLast: false,
    onRename: noop,
    onMove: noop,
    onDelete: noop,
  },
  argTypes: {
    beat: { control: 'object' },
  },
} satisfies Meta<typeof BeatHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ViewOnly: Story = {
  args: { editable: false },
};

export const MenuOpen: Story = {
  args: { isLast: true },
  play: openMenu,
};

export const Renaming: Story = {
  play: async (context) => {
    await openMenu(context);
    // The menu portals to <body>, outside the canvas.
    await context.userEvent.click(
      await within(document.body).findByRole('menuitem', { name: 'Rename' })
    );
  },
};
