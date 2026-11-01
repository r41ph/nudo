import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Decorator } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlotBoard } from '@web/features/plot/components/board/plot-board';
import { PLOTLINE_COLORS } from '@web/features/plot/constants/plot.constants';
import type { Plot } from '@web/features/plot/plot.types';

const TITLES = [
  'The vault plans go missing',
  'Teo lies about the second key',
  'A tram strike strands the crew in the old town for a night',
  'The informant asks for more money',
  'Mara visits her sister',
];

// Some cells left empty and some doubled, so the marks show busy and quiet
// parts of the board.
function makePlot(plotlineCount: number, beatCount: number): Plot {
  const plotlines = Array.from({ length: plotlineCount }, (_, position) => ({
    id: `p${position}`,
    name: `Plotline ${position + 1}`,
    color: PLOTLINE_COLORS[position % PLOTLINE_COLORS.length],
    position,
  }));
  const beats = Array.from({ length: beatCount }, (_, position) => ({
    id: `b${position}`,
    name: `Beat ${position + 1}`,
    position,
  }));
  const cards = plotlines.flatMap((plotline, p) =>
    beats.flatMap((beat, b) =>
      Array.from(
        { length: (p * 3 + b) % 4 === 0 ? 0 : (p + b) % 3 === 0 ? 2 : 1 },
        (_, position) => ({
          id: `c${p}-${b}-${position}`,
          title: TITLES[(p + b + position) % TITLES.length],
          description: '',
          plotlineId: plotline.id,
          beatId: beat.id,
          position,
        })
      )
    )
  );
  return { plotlines, beats, cards };
}

const dark: Decorator = (Story) => (
  <div className="dark flex h-svh min-w-0 flex-1 bg-background">
    <Story />
  </div>
);

const meta = {
  title: 'Plot/PlotMinimap',
  component: PlotBoard,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <div className="flex h-svh bg-background">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
  args: { projectId: 'minimap-story', plot: makePlot(4, 15) },
} satisfies Meta<typeof PlotBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Width-limited: a short miniature across the whole box.
export const WideBoard: Story = { args: { plot: makePlot(3, 15) } };
export const WideBoardDark: Story = { ...WideBoard, decorators: [dark] };

// Height-limited: a narrow miniature, as tall as it gets.
export const TallBoard: Story = { args: { plot: makePlot(14, 3) } };
export const TallBoardDark: Story = { ...TallBoard, decorators: [dark] };

export const BothAxes: Story = { args: { plot: makePlot(8, 15) } };
export const BothAxesDark: Story = { ...BothAxes, decorators: [dark] };

export const FrameScrolledToMiddle: Story = {
  args: { plot: makePlot(8, 15) },
  play: async ({ canvas }) => {
    const container = (await canvas.findByRole('table', { name: 'Plot board' }))
      .parentElement!;
    container.scrollTo({
      left: (container.scrollWidth - container.clientWidth) / 2,
      top: (container.scrollHeight - container.clientHeight) / 2,
    });
  },
};
export const FrameScrolledToMiddleDark: Story = {
  ...FrameScrolledToMiddle,
  decorators: [dark],
};
