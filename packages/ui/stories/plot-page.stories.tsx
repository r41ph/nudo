import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { PlotPage } from '@web/features/plot/components/plot-page';
import type { Plot } from '@web/features/plot/plot.types';

const PLOT: Plot = {
  plotlines: [
    { id: 'p1', name: 'The heist', color: 'blue', position: 0 },
    { id: 'p2', name: 'Mara and Teo', color: 'rose', position: 1 },
    { id: 'p3', name: 'The informant', color: 'ochre', position: 2 },
  ],
  beats: [
    { id: 'b1', name: 'Inciting incident', position: 0 },
    { id: 'b2', name: 'First turn', position: 1 },
    { id: 'b3', name: 'Midpoint', position: 2 },
    { id: 'b4', name: 'Crisis', position: 3 },
    { id: 'b5', name: 'Climax', position: 4 },
  ],
};

type PlotResponse = 'populated' | 'empty' | 'pending' | 'failure';

// Storybook has no API, so the plot's requests are answered here. The client
// reads globalThis.fetch per request, which makes a swap enough. Mutations
// succeed, and the settle refetch then restores the fixture. matchMedia is
// pinned too, so the board's view-only switch ignores the canvas width.
const stubPlot =
  (response: PlotResponse, { editable = true } = {}) =>
  () => {
    const realFetch = globalThis.fetch;
    const realMatchMedia = window.matchMedia;
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
      const plot = response === 'empty' ? { plotlines: [], beats: [] } : PLOT;
      return Response.json({
        data: {
          allPlotlines: { nodes: plot.plotlines },
          allPlotBeats: { nodes: plot.beats },
        },
      });
    };
    window.matchMedia = (query) => ({
      ...realMatchMedia(query),
      matches: editable,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    return () => {
      globalThis.fetch = realFetch;
      window.matchMedia = realMatchMedia;
    };
  };

const meta = {
  title: 'Plot/PlotPage',
  component: PlotPage,
  parameters: { layout: 'fullscreen' },
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
