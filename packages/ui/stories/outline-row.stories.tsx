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
    isOpen: false,
    isActive: false,
    onRename: noop,
    onDelete: noop,
    onAddChild: noop,
    onSetStatus: noop,
    onToggle: noop,
  },
} satisfies Meta<typeof OutlineRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// A leaf you write in — bullet marker. Hover to reveal grip + actions.
export const Document: Story = {};

export const ActiveDocument: Story = {
  args: { isActive: true },
};

export const DocumentWithStatus: Story = {
  args: { title: 'Chapter Three', status: 'drafting' },
};

// A container — chevron marker; word count is the rolled-up total.
export const FolderCollapsed: Story = {
  args: { title: 'Part One', kind: 'folder', wordCount: 18280 },
};

export const FolderExpanded: Story = {
  args: { title: 'Part One', kind: 'folder', isOpen: true, wordCount: 18280 },
};

export const FolderDone: Story = {
  args: {
    title: 'Salt and Iron',
    kind: 'folder',
    status: 'done',
    wordCount: 3120,
  },
};

// A flat scoping marker — rule + label + fold chevron. No prose, no status.
export const Separator: Story = {
  args: { title: 'PART TWO', kind: 'separator', isOpen: true },
};

export const SeparatorFolded: Story = {
  args: { title: 'PART TWO', kind: 'separator', isOpen: false },
};
