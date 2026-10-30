import type { Meta, StoryObj } from '@storybook/react-vite';
import { within } from 'storybook/test';
import { ProjectTitleDialog } from '@web/features/project/components/project-title-dialog';

// The dialog portals to <body>, outside the canvas.
const body = () => within(document.body);

const meta = {
  title: 'Project/ProjectTitleDialog',
  component: ProjectTitleDialog,
  parameters: { layout: 'centered' },
  args: {
    open: true,
    onOpenChange: () => {},
    heading: 'New project',
    onSave: () => Promise.resolve(),
  },
} satisfies Meta<typeof ProjectTitleDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {};

export const Rename: Story = {
  args: { heading: 'Rename project', defaultTitle: 'The Lamp' },
};

export const EmptyTitle: Story = {
  play: async ({ userEvent }) => {
    await userEvent.click(await body().findByRole('button', { name: 'Save' }));
  },
};

export const Pending: Story = {
  args: {
    heading: 'Rename project',
    defaultTitle: 'The Lamp',
    onSave: () => new Promise(() => {}),
  },
  play: async ({ userEvent }) => {
    await userEvent.click(await body().findByRole('button', { name: 'Save' }));
  },
};

export const SaveFailed: Story = {
  args: {
    heading: 'Rename project',
    defaultTitle: 'The Lamp',
    onSave: () => Promise.reject(new Error('Network error')),
  },
  play: async ({ userEvent }) => {
    await userEvent.click(await body().findByRole('button', { name: 'Save' }));
  },
};
