import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PlotFilterRow } from '@web/features/plot/components/sidebar/plot-filter-row';
import {
  PLOTLINE_COLORS,
  PLOTLINE_COLOR_LABELS,
  PLOTLINE_COLOR_VAR,
} from '@web/features/plot/constants/plot.constants';

const meta = {
  title: 'Plot/PlotFilterRow',
  component: PlotFilterRow,
  parameters: { layout: 'centered' },
  args: {
    name: 'The heist',
    visible: true,
    onToggle: fn(),
    color: PLOTLINE_COLOR_VAR.color6,
    cardCount: 11,
  },
  decorators: [
    (Story) => (
      <ul className="w-[260px] bg-sidebar p-2">
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof PlotFilterRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {};

export const Hidden: Story = { args: { visible: false } };

export const LongName: Story = {
  args: {
    name: 'The informant who sold the map twice and then vanished',
  },
};

export const Beat: Story = {
  args: { name: 'Inciting incident', color: undefined, cardCount: undefined },
};

export const HiddenBeat: Story = {
  args: { ...Beat.args, visible: false },
};

const REORDER = { id: 'p1', type: 'plotline', dragType: null } as const;

// The handle shows on hover or focus; tab to it to see it here.
export const Editable: Story = { args: { reorder: REORDER } };

export const DropBefore: Story = {
  args: { reorder: { ...REORDER, dropSide: 'before' } },
};

export const DropAfter: Story = {
  args: { reorder: { ...REORDER, dropSide: 'after' } },
};

// Ticked, then unticked, for every palette colour.
export const EachColour: Story = {
  render: (args) => (
    <>
      {PLOTLINE_COLORS.flatMap((color) =>
        [true, false].map((visible) => (
          <PlotFilterRow
            key={`${color}-${visible}`}
            {...args}
            name={PLOTLINE_COLOR_LABELS[color]}
            color={PLOTLINE_COLOR_VAR[color]}
            visible={visible}
          />
        ))
      )}
    </>
  ),
};
