import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PlotFilterRow } from '@web/features/plot/components/sidebar/plot-filter-row';
import { PlotFilterSection } from '@web/features/plot/components/sidebar/plot-filter-section';

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

export const Few: Story = {
  args: {
    children: ['The heist', 'Mara and Teo'].map((name, i) => (
      <PlotFilterRow key={name} name={name} cardCount={i * 3} />
    )),
  },
};

// Taller than its box: the list scrolls under a header that stays put.
export const Overflowing: Story = {
  args: {
    children: Array.from({ length: 20 }, (_, i) => (
      <PlotFilterRow key={i} name={`Plotline ${i + 1}`} cardCount={i} />
    )),
  },
};

export const ShowAllEnabled: Story = {
  args: { ...Few.args, canShowAll: true },
};
