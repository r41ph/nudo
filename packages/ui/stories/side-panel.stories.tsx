import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SidePanel } from '@web/shared/components/side-panel';

const meta = {
  title: 'Shared/SidePanel',
  component: SidePanel,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="relative h-[480px] overflow-hidden bg-background p-10 text-[15px] leading-7 text-prose">
        <p className="max-w-[560px]">
          Mara arrived shortly after dusk. Rain made a mirror of the narrow
          street, doubling every window and every passing light.
        </p>
        <Story />
      </div>
    ),
  ],
  args: {
    id: 'panel',
    side: 'right',
    width: '336px',
    label: 'Document details',
    collapsed: false,
    onCollapse: fn(),
    children: (
      <div className="p-5 text-[12.5px] text-muted-foreground">
        Panel content
      </div>
    ),
  },
} satisfies Meta<typeof SidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RightExpanded: Story = {};

export const RightCollapsed: Story = { args: { collapsed: true } };

export const LeftExpanded: Story = {
  args: { side: 'left', width: '295px', label: 'Outline' },
};

export const LeftCollapsed: Story = {
  args: { side: 'left', width: '295px', label: 'Outline', collapsed: true },
};
