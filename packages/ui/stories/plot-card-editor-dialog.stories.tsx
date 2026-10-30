import type { Meta, StoryObj } from '@storybook/react-vite';
import { within } from 'storybook/test';
import { CardEditorDialog } from '@web/features/plot/components/card-editor/card-editor-dialog';

const PLOTLINES = [
  { id: 'p1', name: 'The heist', color: 'color6' as const, position: 0 },
  { id: 'p2', name: 'Mara and Teo', color: 'color8' as const, position: 1 },
];
const BEATS = [
  { id: 'b1', name: 'Inciting incident', position: 0 },
  { id: 'b2', name: 'Midpoint', position: 1 },
];
const CARD = {
  id: 'c1',
  title: 'Mara cases the vault',
  description: 'She counts the guards twice and gets two answers.',
  plotlineId: 'p1',
  beatId: 'b1',
  position: 0,
};

const never = () => new Promise<never>(() => {});
// The dialog portals to <body>, outside the canvas.
const body = () => within(document.body);

const meta = {
  title: 'Plot/CardEditorDialog',
  component: CardEditorDialog,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onOpenChange: () => {},
    card: CARD,
    placement: { plotlineId: 'p1', beatId: 'b1' },
    plotlines: PLOTLINES,
    beats: BEATS,
    editable: true,
    onSave: async () => {},
    onDelete: async () => {},
  },
} satisfies Meta<typeof CardEditorDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Edit: Story = {};

export const Add: Story = {
  args: { card: null, placement: { plotlineId: 'p2', beatId: 'b2' } },
};

export const DeleteConfirm: Story = {
  play: async ({ userEvent }) => {
    await userEvent.click(
      await body().findByRole('button', { name: 'Delete' })
    );
  },
};

export const Saving: Story = {
  args: { onSave: never },
  play: async ({ userEvent }) => {
    await userEvent.click(await body().findByRole('button', { name: 'Save' }));
  },
};

export const SaveError: Story = {
  args: { onSave: () => Promise.reject(new Error('boom')) },
  play: async ({ userEvent }) => {
    await userEvent.click(await body().findByRole('button', { name: 'Save' }));
  },
};

export const DiscardChanges: Story = {
  play: async ({ userEvent }) => {
    await userEvent.type(
      await body().findByRole('textbox', { name: 'Title' }),
      ' tonight'
    );
    await userEvent.click(body().getByRole('button', { name: 'Cancel' }));
  },
};

export const ReadOnly: Story = {
  args: { editable: false },
};
