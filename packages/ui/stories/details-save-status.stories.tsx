import type { Meta, StoryObj } from '@storybook/react-vite';
import { DetailsSaveStatus } from '@web/features/document/components/details-save-status';

const meta = {
  title: 'Document/DetailsSaveStatus',
  component: DetailsSaveStatus,
  parameters: { layout: 'centered' },
  args: { state: 'idle', onRetry: () => {} },
} satisfies Meta<typeof DetailsSaveStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Saving: Story = { args: { state: 'saving' } };

export const Saved: Story = { args: { state: 'saved' } };

export const Failed: Story = { args: { state: 'error' } };
