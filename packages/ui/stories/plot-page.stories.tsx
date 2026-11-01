import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { PlotPage } from '@web/features/plot/components/plot-page';
import { PlotSidebarPanel } from '@web/features/plot/components/sidebar/plot-sidebar-panel';
import {
  PLOTLINE_COLORS,
  PLOT_VIEW_STORAGE_PREFIX,
} from '@web/features/plot/constants/plot.constants';
import type { Plot } from '@web/features/plot/plot.types';

const PLOT: Plot = {
  plotlines: [
    { id: 'p1', name: 'The heist', color: 'color6', position: 0 },
    { id: 'p2', name: 'Mara and Teo', color: 'color8', position: 1 },
    { id: 'p3', name: 'The informant', color: 'color2', position: 2 },
  ],
  beats: [
    { id: 'b1', name: 'Inciting incident', position: 0 },
    { id: 'b2', name: 'First turn', position: 1 },
    { id: 'b3', name: 'Midpoint', position: 2 },
    { id: 'b4', name: 'Crisis', position: 3 },
    { id: 'b5', name: 'Climax', position: 4 },
  ],
  cards: [
    {
      id: 'c1',
      title: 'Mara cases the vault',
      description: 'She counts the guards twice and gets two answers.',
      plotlineId: 'p1',
      beatId: 'b1',
      position: 0,
    },
    {
      id: 'c2',
      title: '',
      description: 'Does Teo already know about the second key?',
      plotlineId: 'p1',
      beatId: 'b1',
      position: 1,
    },
    {
      id: 'c3',
      title: 'The alarm trips early and the crew splits up across the old town',
      description:
        'Nobody planned for this. Mara takes the river route, Teo the ' +
        'rooftops, and the informant vanishes with the only map of the ' +
        'tunnels. From here on every choice costs someone something.',
      plotlineId: 'p1',
      beatId: 'b3',
      position: 0,
    },
    {
      id: 'c4',
      title: 'They argue on the tram',
      description: '',
      plotlineId: 'p2',
      beatId: 'b2',
      position: 0,
    },
  ],
};

const DENSE_TITLES = [
  'The vault plans go missing',
  'Teo lies about the second key',
  '',
  'A tram strike strands the crew in the old town for a night',
  'The informant asks for more money',
  'Mara visits her sister',
];

// Every cell filled, some twice, to check scrolling and row height.
const DENSE_PLOT: Plot = (() => {
  const plotlines = [
    'The heist',
    'Mara and Teo',
    'The informant',
    'The police',
    'Lisbon',
    'Old debts',
  ].map((name, position) => ({
    id: `dp${position}`,
    name,
    color: PLOTLINE_COLORS[position % PLOTLINE_COLORS.length],
    position,
  }));
  const beats = [
    'Opening',
    'Inciting incident',
    'First turn',
    'Pinch',
    'Midpoint',
    'Crisis',
    'Climax',
    'Ending',
  ].map((name, position) => ({ id: `db${position}`, name, position }));
  const cards = plotlines.flatMap((plotline, p) =>
    beats.flatMap((beat, b) =>
      Array.from({ length: (p + b) % 3 === 0 ? 2 : 1 }, (_, position) => ({
        id: `dc${p}-${b}-${position}`,
        title: DENSE_TITLES[(p + b + position) % DENSE_TITLES.length],
        description:
          (p + b) % 2 === 0
            ? 'Something here has to change before the end.'
            : '',
        plotlineId: plotline.id,
        beatId: beat.id,
        position,
      }))
    )
  );
  return { plotlines, beats, cards };
})();

type PlotResponse =
  | 'populated'
  | 'dense'
  | 'empty'
  | 'pending'
  | 'failure'
  | 'refresh-failure';

// Storybook has no API, so the plot's requests are answered here. The client
// reads globalThis.fetch per request, which makes a swap enough. Mutations
// succeed, and the settle refetch then restores the fixture, except under
// 'refresh-failure', where every load after the first fails. matchMedia is
// pinned too, so the board's view-only switch ignores the canvas width.
const stubPlot =
  (response: PlotResponse, { editable = true } = {}) =>
  () => {
    const realFetch = globalThis.fetch;
    const realMatchMedia = window.matchMedia;
    let loads = 0;
    globalThis.fetch = async (_input, init) => {
      if (response === 'pending') return new Promise<Response>(() => {});
      if (response === 'failure') {
        return Response.json(
          { errors: [{ message: 'Load failed' }] },
          { status: 500 }
        );
      }
      const { query } = JSON.parse(String(init?.body));
      if (!String(query).includes('query GetPlot')) {
        return Response.json({ data: {} });
      }
      loads += 1;
      if (response === 'refresh-failure' && loads > 1) {
        return Response.json(
          { errors: [{ message: 'Refresh failed' }] },
          { status: 500 }
        );
      }
      const plot =
        response === 'empty'
          ? { plotlines: [], beats: [], cards: [] }
          : response === 'dense'
            ? DENSE_PLOT
            : PLOT;
      return Response.json({
        data: {
          allPlotlines: { nodes: plot.plotlines },
          allPlotBeats: { nodes: plot.beats },
          allPlotCards: { nodes: plot.cards },
        },
      });
    };
    // Only width queries: reduced motion and colour scheme stay the reader's.
    window.matchMedia = (query) => ({
      ...realMatchMedia(query),
      matches: query.includes('width')
        ? editable
        : realMatchMedia(query).matches,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    return () => {
      globalThis.fetch = realFetch;
      window.matchMedia = realMatchMedia;
    };
  };

const VIEW_KEY = `${PLOT_VIEW_STORAGE_PREFIX}northwater`;

const meta = {
  title: 'Plot/PlotPage',
  component: PlotPage,
  parameters: { layout: 'fullscreen' },
  // A story's own cleanup doesn't run when the preview reloads, so a filter
  // stored by EverythingHidden would otherwise leak into the next story.
  beforeEach: () => localStorage.removeItem(VIEW_KEY),
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      return (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/project/northwater/plot']}>
            <Routes>
              <Route
                path="/project/:projectId/plot"
                element={
                  <div className="flex h-svh bg-background">
                    <Story />
                  </div>
                }
              />
            </Routes>
          </MemoryRouter>
          <Toaster />
        </QueryClientProvider>
      );
    },
  ],
} satisfies Meta<typeof PlotPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  beforeEach: stubPlot('populated'),
};

export const Dense: Story = {
  beforeEach: stubPlot('dense'),
};

export const FilteredFromTheSidebar: Story = {
  beforeEach: stubPlot('populated'),
  render: () => (
    <>
      <div className="flex w-[260px] shrink-0 flex-col bg-sidebar px-4 pt-6 pb-5">
        <PlotSidebarPanel />
      </div>
      <PlotPage />
    </>
  ),
};

export const ReadOnly: Story = {
  beforeEach: stubPlot('populated', { editable: false }),
};

export const Empty: Story = {
  beforeEach: stubPlot('empty'),
};

export const Loading: Story = {
  beforeEach: stubPlot('pending'),
};

export const LoadError: Story = {
  beforeEach: stubPlot('failure'),
};

// Stored like a real filter that hides every plotline.
export const EverythingHidden: Story = {
  beforeEach: [
    stubPlot('populated'),
    () =>
      localStorage.setItem(
        VIEW_KEY,
        JSON.stringify({
          hiddenPlotlineIds: PLOT.plotlines.map((p) => p.id),
          hiddenBeatIds: [],
        })
      ),
  ],
};

export const RefreshFailed: Story = {
  beforeEach: stubPlot('refresh-failure'),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Plotline' })
    );
  },
};
