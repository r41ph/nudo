import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { plotQueryKey } from '@web/features/plot/api/plot.api';
import { PlotSidebarPanel } from '@web/features/plot/components/sidebar/plot-sidebar-panel';
import { PLOTLINE_COLORS } from '@web/features/plot/constants/plot.constants';
import type { Plot } from '@web/features/plot/plot.types';
import { PLOT_ROUTE } from '@web/shared/lib/routes';

const PROJECT_ID = 'story-project';

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
    { plotlineId: 'p1', beatId: 'b1' },
    { plotlineId: 'p1', beatId: 'b3' },
    { plotlineId: 'p2', beatId: 'b2' },
  ].map((cell, position) => ({
    id: `c${position}`,
    title: '',
    description: '',
    position,
    ...cell,
  })),
};

// Twenty of each, more than fit, so both lists scroll on their own.
const DENSE_PLOT: Plot = {
  plotlines: Array.from({ length: 20 }, (_, position) => ({
    id: `dp${position}`,
    name:
      position === 3
        ? 'A plotline with a name far too long to fit the sidebar'
        : `Plotline ${position + 1}`,
    color: PLOTLINE_COLORS[position % PLOTLINE_COLORS.length],
    position,
  })),
  beats: Array.from({ length: 20 }, (_, position) => ({
    id: `db${position}`,
    name: `Beat ${position + 1}`,
    position,
  })),
  cards: [],
};

const EMPTY_PLOT: Plot = { plotlines: [], beats: [], cards: [] };

// Seeded, so the panel renders without a network.
function withPlot(plot: Plot) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  queryClient.setQueryData(plotQueryKey(PROJECT_ID), plot);
  return queryClient;
}

// The panel reads the viewport to decide whether it is editable; pinned so the
// canvas width doesn't decide for the story.
const pinEditable =
  (editable = true) =>
  () => {
    const realMatchMedia = window.matchMedia;
    window.matchMedia = (query) => ({
      ...realMatchMedia(query),
      matches: editable,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    return () => {
      window.matchMedia = realMatchMedia;
    };
  };

const meta = {
  title: 'Plot/PlotSidebarPanel',
  component: PlotSidebarPanel,
  parameters: { layout: 'centered' },
  beforeEach: pinEditable(),
  decorators: [
    (Story, { parameters }) => (
      <JotaiProvider store={createStore()}>
        <QueryClientProvider client={withPlot(parameters.plot as Plot)}>
          <MemoryRouter initialEntries={[`/project/${PROJECT_ID}/plot`]}>
            <Routes>
              <Route
                path={PLOT_ROUTE}
                element={
                  <div className="flex h-[640px] w-[260px] flex-col bg-sidebar p-2">
                    <Story />
                  </div>
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </JotaiProvider>
    ),
  ],
} satisfies Meta<typeof PlotSidebarPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { parameters: { plot: PLOT } };

export const Dense: Story = { parameters: { plot: DENSE_PLOT } };

export const NotStarted: Story = { parameters: { plot: EMPTY_PLOT } };

export const ViewOnly: Story = {
  parameters: { plot: PLOT },
  beforeEach: pinEditable(false),
};
