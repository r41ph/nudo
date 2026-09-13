import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { EditorBreadcrumb } from '@web/features/document/components/editor-breadcrumb';

const meta = {
  title: 'Editor/EditorBreadcrumb',
  component: EditorBreadcrumb,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof EditorBreadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  args: { crumbs: [{ id: '1', title: 'The Tidewatch' }] },
};

export const Nested: Story = {
  args: {
    crumbs: [
      { id: '1', title: 'Part I' },
      { id: '2', title: 'The Tidewatch' },
    ],
  },
};

export const Deep: Story = {
  args: {
    crumbs: [
      { id: '1', title: 'Part I' },
      { id: '2', title: 'The Tidewatch' },
      { id: '3', title: 'A scene at the harbour' },
    ],
  },
};
