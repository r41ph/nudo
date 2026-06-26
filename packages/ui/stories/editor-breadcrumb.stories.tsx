import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditorBreadcrumb } from '@web/features/document/components/editor-breadcrumb';

const meta = {
  title: 'Editor/EditorBreadcrumb',
  component: EditorBreadcrumb,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof EditorBreadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

// A root-level document: a single, emphasised crumb.
export const Single: Story = {
  args: { crumbs: [{ id: '1', title: 'The Tidewatch' }] },
};

// A chapter nested under a part: ancestor muted, current emphasised.
export const Nested: Story = {
  args: {
    crumbs: [
      { id: '1', title: 'Part I' },
      { id: '2', title: 'The Tidewatch' },
    ],
  },
};

// A section three levels deep — the full ancestry chain.
export const Deep: Story = {
  args: {
    crumbs: [
      { id: '1', title: 'Part I' },
      { id: '2', title: 'The Tidewatch' },
      { id: '3', title: 'A scene at the harbour' },
    ],
  },
};
