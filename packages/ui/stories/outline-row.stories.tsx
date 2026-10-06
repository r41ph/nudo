import type { Meta, StoryObj } from '@storybook/react-vite';
import { OutlineRow } from '@web/features/outline/components/outline-row';

const noop = () => {};

const meta = {
  title: 'Outline/OutlineRow',
  component: OutlineRow,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-[280px] rounded-md bg-sidebar p-2">
        <Story />
      </div>
    ),
  ],
  args: {
    id: '1',
    title: 'The Tidewatch',
    kind: 'document',
    status: null,
    wordCount: 1240,
    descendantCount: 0,
    isOpen: false,
    isActive: false,
    onRename: noop,
    onDelete: noop,
    onAddChild: noop,
    onSetStatus: noop,
    onOpenDetails: noop,
    onToggle: noop,
  },
} satisfies Meta<typeof OutlineRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Document: Story = {};

export const ActiveDocument: Story = {
  args: { isActive: true },
};

export const DocumentWithStatus: Story = {
  args: { title: 'Chapter Three', status: 'drafting' },
};

export const FolderCollapsed: Story = {
  args: {
    title: 'Part One',
    kind: 'folder',
    wordCount: 18280,
    descendantCount: 4,
  },
};

export const FolderExpanded: Story = {
  args: {
    title: 'Part One',
    kind: 'folder',
    isOpen: true,
    wordCount: 18280,
    descendantCount: 4,
  },
};

export const FolderEmpty: Story = {
  args: { title: 'Part One', kind: 'folder', wordCount: 0 },
};

export const FolderDone: Story = {
  args: {
    title: 'Salt and Iron',
    kind: 'folder',
    status: 'done',
    wordCount: 3120,
    descendantCount: 2,
  },
};

export const Separator: Story = {
  args: { title: 'PART TWO', kind: 'separator', isOpen: true },
};

export const SeparatorFolded: Story = {
  args: { title: 'PART TWO', kind: 'separator', isOpen: false },
};
