import type { Meta, StoryObj } from '@storybook/react-vite';
import { OutlineTree } from '@web/features/outline/components/outline-tree';
import type { OutlineNode } from '@web/shared/types/outline.types';

const noop = () => {};

const callbacks = {
  onOpenNode: noop,
  onRenameNode: noop,
  onDeleteNode: noop,
  onAddChild: noop,
  onSetStatus: noop,
  onMoveNode: noop,
};

const node = (
  id: string,
  title: string,
  parentId: string | null,
  position: number,
  overrides: Partial<OutlineNode> = {}
): OutlineNode => ({
  id,
  title,
  parentId,
  position,
  kind: 'document',
  status: null,
  wordCount: 0,
  pov: '',
  ...overrides,
});

const nodes: OutlineNode[] = [
  node('p1', 'Part One', null, 0, {
    kind: 'folder',
    status: 'drafting',
    wordCount: 18280,
  }),
  node('c1', 'The Tidewatch', 'p1', 0, { status: 'done', wordCount: 4120 }),
  node('c2', 'Salt and Iron', 'p1', 1, { status: 'drafting', wordCount: 2890 }),
  node('c3', 'Interlude', 'p1', 2, { kind: 'folder', wordCount: 11270 }),
  node('c3a', 'The letter', 'c3', 0, { wordCount: 6200 }),
  node('c3b', 'What the harbourmaster saw', 'c3', 1, { wordCount: 5070 }),
  node('sep', 'PART TWO', null, 1, { kind: 'separator' }),
  node('p2', 'Part Two', null, 2, { kind: 'folder', wordCount: 0 }),
  node('n1', 'Notes', null, 3, { wordCount: 312 }),
];

const meta = {
  title: 'Outline/OutlineTree',
  component: OutlineTree,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-[280px] rounded-md bg-sidebar p-2">
        <Story />
      </div>
    ),
  ],
  args: { nodes, callbacks },
} satisfies Meta<typeof OutlineTree>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Nested: Story = {};

export const WithActiveDocument: Story = {
  args: { activeItemId: 'c3a' },
};
