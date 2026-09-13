import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  NodeStatusControl,
  StatusDot,
} from '@web/features/outline/components/status-control';

const meta = {
  title: 'Outline/NodeStatusControl',
  component: NodeStatusControl,
  parameters: { layout: 'centered' },
  // The control only reveals on row hover, so it needs a stand-in `group/row`.
  decorators: [
    (Story) => (
      <div className="group/row flex items-center gap-2 rounded-md bg-sidebar p-3">
        <span className="text-xs text-muted-foreground">hover me →</span>
        <Story />
      </div>
    ),
  ],
  args: { onChange: () => {} },
} satisfies Meta<typeof NodeStatusControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Planned: Story = { args: { status: 'planned' } };
export const Drafting: Story = { args: { status: 'drafting' } };
export const Done: Story = { args: { status: 'done' } };
export const Unset: Story = { args: { status: null } };

export const AllDots: StoryObj = {
  render: () => (
    <div className="flex items-center gap-4">
      <StatusDot status="planned" />
      <StatusDot status="drafting" />
      <StatusDot status="done" />
    </div>
  ),
};
