import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlotEmpty } from '@web/features/plot/components/plot-empty';

const meta = {
  title: 'Plot/PlotEmpty',
  component: PlotEmpty,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex h-[480px] bg-background">
        <Story />
      </div>
    ),
  ],
  args: { editable: true, starting: false, onStart: () => {} },
} satisfies Meta<typeof PlotEmpty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Starting: Story = {
  args: { starting: true },
};

export const ViewOnly: Story = {
  args: { editable: false },
};
