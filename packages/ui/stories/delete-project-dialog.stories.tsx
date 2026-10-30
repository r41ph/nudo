import type { Meta, StoryObj } from '@storybook/react-vite';
import { within } from 'storybook/test';
import { DeleteProjectDialog } from '@web/features/project/components/delete-project-dialog';

const typeTitle: Story['play'] = async ({ userEvent }) => {
  // The dialog portals to <body>, outside the canvas.
  await userEvent.type(
    await within(document.body).findByLabelText('Type the title to confirm'),
    'the lamp'
  );
};

const meta = {
  title: 'Project/DeleteProjectDialog',
  component: DeleteProjectDialog,
  parameters: { layout: 'centered' },
  args: {
    open: true,
    onOpenChange: () => {},
    title: 'The Lamp',
    documentCount: 23,
    onConfirm: () => Promise.resolve(),
  },
} satisfies Meta<typeof DeleteProjectDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyInput: Story = {};

export const OneDocument: Story = {
  args: { documentCount: 1 },
};

export const MatchingInput: Story = {
  play: typeTitle,
};

export const Pending: Story = {
  args: { onConfirm: () => new Promise(() => {}) },
  play: async (context) => {
    await typeTitle(context);
    await context.userEvent.click(
      within(document.body).getByRole('button', { name: 'Delete project' })
    );
  },
};
