import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@ui/components/ui/button';
import { DeleteNodeDialog } from '@web/features/outline/components/delete-node-dialog';

const meta = {
  title: 'Outline/DeleteNodeDialog',
  component: DeleteNodeDialog,
  parameters: { layout: 'centered' },
  args: {
    open: true,
    onOpenChange: () => {},
    title: 'Welcome Document',
    descendantCount: 0,
    onConfirm: () => {},
  },
} satisfies Meta<typeof DeleteNodeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A leaf — nothing goes with it. */
export const LeafNode: Story = {};

/** A chapter — the body has to name what the cascade takes. */
export const WithDescendants: Story = {
  args: { title: 'Chapter One', descendantCount: 2 },
};

export const WithOneDescendant: Story = {
  args: { title: 'Chapter One', descendantCount: 1 },
};

/** Driven from a trigger, so the open/close transition is visible. */
export const FromTrigger: Story = {
  args: { open: false },
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Delete “Chapter One”
        </Button>
        <DeleteNodeDialog
          {...args}
          title="Chapter One"
          descendantCount={3}
          open={open}
          onOpenChange={setOpen}
        />
      </>
    );
  },
};
