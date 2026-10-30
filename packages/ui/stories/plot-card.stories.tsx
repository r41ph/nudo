import type { Meta, StoryObj } from '@storybook/react-vite';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { PlotCard } from '@web/features/plot/components/board/plot-card';
import { PLOT_BEAT_COLUMN_WIDTH } from '@web/features/plot/constants/plot.constants';

const CELL = { plotlineId: 'p1', beatId: 'b1' };

const meta = {
  title: 'Plot/PlotCard',
  component: PlotCard,
  parameters: { layout: 'padded' },
  decorators: [
    (Story, { args }) => (
      <DndContext>
        <SortableContext items={[args.card.id]}>
          <div
            className="bg-background p-2"
            style={{ width: PLOT_BEAT_COLUMN_WIDTH }}
          >
            <Story />
          </div>
        </SortableContext>
      </DndContext>
    ),
  ],
  args: {
    card: {
      id: 'c1',
      title: 'Mara cases the vault',
      description: 'She counts the guards twice and gets two answers.',
      position: 0,
      ...CELL,
    },
    cell: CELL,
    color: 'color6',
    editable: true,
    dragType: null,
    onOpen: () => {},
  },
  argTypes: {
    card: { control: 'object' },
  },
} satisfies Meta<typeof PlotCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Untitled: Story = {
  args: {
    card: {
      id: 'c2',
      title: '',
      description: 'Does Teo already know about the second key?',
      position: 0,
      ...CELL,
    },
  },
};

export const TitleOnly: Story = {
  args: {
    card: {
      id: 'c3',
      title: 'They argue on the tram',
      description: '',
      position: 0,
      ...CELL,
    },
    color: 'color8',
  },
};

export const Long: Story = {
  args: {
    card: {
      id: 'c4',
      title: 'The alarm trips early and the crew splits up across the old town',
      description:
        'Nobody planned for this. Mara takes the river route, Teo the ' +
        'rooftops, and the informant vanishes with the only map of the ' +
        'tunnels. From here on every choice costs someone something.',
      position: 0,
      ...CELL,
    },
  },
};

// The faded ghost left in the cell while the card is picked up.
export const Dragging: Story = {
  play: async ({ canvas, userEvent }) => {
    canvas.getByRole('button', { name: 'Mara cases the vault' }).focus();
    await userEvent.keyboard('[Space]');
  },
};
