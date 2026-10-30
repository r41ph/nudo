import type { Meta, StoryObj } from '@storybook/react-vite';
import { within } from 'storybook/test';
import { PlotlineLabel } from '@web/features/plot/components/board/plotline-label';
import {
  PLOTLINE_COLORS,
  PLOTLINE_COLOR_LABELS,
  PLOT_LABEL_COLUMN_WIDTH,
} from '@web/features/plot/constants/plot.constants';

const noop = () => {};

const openMenu: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.click(
    canvas.getByRole('button', { name: 'Actions for The heist' })
  );
};

const meta = {
  title: 'Plot/PlotlineLabel',
  component: PlotlineLabel,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="bg-background" style={{ width: PLOT_LABEL_COLUMN_WIDTH }}>
        <Story />
      </div>
    ),
  ],
  args: {
    plotline: { id: 'p1', name: 'The heist', color: 'blue', position: 0 },
    editable: true,
    isFirst: false,
    isLast: false,
    onRename: noop,
    onColorChange: noop,
    onMove: noop,
    onDelete: noop,
  },
  argTypes: {
    plotline: { control: 'object' },
  },
} satisfies Meta<typeof PlotlineLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EachColour: Story = {
  render: (args) => (
    <>
      {PLOTLINE_COLORS.map((color, index) => (
        <PlotlineLabel
          key={color}
          {...args}
          plotline={{
            id: color,
            name: PLOTLINE_COLOR_LABELS[color],
            color,
            position: index,
          }}
        />
      ))}
    </>
  ),
};

export const LongName: Story = {
  args: {
    plotline: {
      id: 'p1',
      name: 'Mara and Teo argue about whether to leave Lisbon',
      color: 'plum',
      position: 0,
    },
  },
};

export const ViewOnly: Story = {
  args: { editable: false },
};

export const MenuOpen: Story = {
  args: { isFirst: true },
  play: openMenu,
};

export const ColourMenuOpen: Story = {
  play: async (context) => {
    await openMenu(context);
    // The menu portals to <body>, outside the canvas.
    await context.userEvent.click(
      await within(document.body).findByRole('menuitem', { name: 'Colour' })
    );
  },
};

export const Renaming: Story = {
  play: async (context) => {
    await openMenu(context);
    await context.userEvent.click(
      await within(document.body).findByRole('menuitem', { name: 'Rename' })
    );
  },
};
