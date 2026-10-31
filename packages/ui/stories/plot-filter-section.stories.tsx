import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PlotFilterRow } from '@web/features/plot/components/sidebar/plot-filter-row';
import { PlotFilterSection } from '@web/features/plot/components/sidebar/plot-filter-section';
import {
  PLOTLINE_COLORS,
  PLOTLINE_COLOR_VAR,
} from '@web/features/plot/constants/plot.constants';

const meta = {
  title: 'Plot/PlotFilterSection',
  component: PlotFilterSection,
  parameters: { layout: 'centered' },
  args: {
    label: 'Plotlines',
    canShowAll: false,
    onShowAll: fn(),
    children: null,
  },
  decorators: [
    (Story) => (
      <div className="flex h-[360px] w-[260px] flex-col bg-sidebar p-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PlotFilterSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = (name: string, index: number, visible = true) => (
  <PlotFilterRow
    key={name}
    name={name}
    visible={visible}
    onToggle={() => {}}
    color={PLOTLINE_COLOR_VAR[PLOTLINE_COLORS[index % PLOTLINE_COLORS.length]]}
    cardCount={index * 3}
  />
);

export const Few: Story = {
  args: {
    children: ['The heist', 'Mara and Teo'].map((name, i) => row(name, i)),
  },
};

// Taller than its box: the list scrolls under a header that stays put.
export const Overflowing: Story = {
  args: {
    children: Array.from({ length: 20 }, (_, i) => row(`Plotline ${i + 1}`, i)),
  },
};

export const ShowAllEnabled: Story = {
  args: {
    canShowAll: true,
    children: ['The heist', 'Mara and Teo'].map((name, i) =>
      row(name, i, i === 0)
    ),
  },
};
