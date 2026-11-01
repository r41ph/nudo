import {
  Profiler,
  useEffect,
  type ProfilerOnRenderCallback,
  type ReactNode,
} from 'react';
import { vi } from 'vitest';
import { graphql, HttpResponse } from 'msw';
import { Toaster } from 'sonner';
import { PlotBoard } from '@web/features/plot/components/board/plot-board';
import { usePlot } from '@web/features/plot/hooks/use-plot';
import { usePlotView } from '@web/features/plot/state/plot-view.store';
import { server } from '@web/test/mocks/server';
import { MOCK_PROJECT } from '@web/test/mocks/fixtures';
import { renderWithProviders } from '@web/test/test-utils';

type PlotViewApi = ReturnType<typeof usePlotView>;
const viewRef: { current: PlotViewApi | null } = { current: null };

// Render it next to the board to drive the filters the way the sidebar does.
export function ViewHandle() {
  const plotView = usePlotView(MOCK_PROJECT.id);
  useEffect(() => {
    viewRef.current = plotView;
  });
  return null;
}

export const view = {
  toggle: (...args: Parameters<PlotViewApi['toggle']>) =>
    viewRef.current!.toggle(...args),
};

function Board() {
  const { data } = usePlot(MOCK_PROJECT.id);
  return data ? <PlotBoard projectId={MOCK_PROJECT.id} plot={data} /> : null;
}

export function renderBoard(
  extra?: ReactNode,
  onRender?: ProfilerOnRenderCallback
) {
  return renderWithProviders(
    <>
      {onRender ? (
        <Profiler id="board" onRender={onRender}>
          <Board />
        </Profiler>
      ) : (
        <Board />
      )}
      <Toaster />
      {extra}
    </>
  );
}

export function servePlot(
  plotlines: readonly unknown[],
  beats: readonly unknown[],
  cards: readonly unknown[] = []
) {
  server.use(
    graphql.query('GetPlot', () =>
      HttpResponse.json({
        data: {
          allPlotlines: { nodes: plotlines },
          allPlotBeats: { nodes: beats },
          allPlotCards: { nodes: cards },
        },
      })
    )
  );
}

// Holds the mutation in flight: the settle refetch would otherwise replace
// the optimistic board with the fixture, which never changes.
export function holdMutation(operation: string) {
  const variables = vi.fn();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  server.use(
    graphql.mutation(operation, async ({ variables: vars }) => {
      variables(vars);
      await gate;
      return HttpResponse.json({ data: {} });
    })
  );
  return { variables, release };
}

// Holds the settle refetch after a confirmed card mutation: the fixture never
// changes, so letting it land would drop the card the test just saved. Call
// once the board has loaded.
export function holdPlotRefetch() {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  server.use(
    graphql.query('GetPlot', async () => {
      await gate;
      return HttpResponse.json({ data: null });
    })
  );
  return { release };
}

export function failMutation(operation: string) {
  const variables = vi.fn();
  server.use(
    graphql.mutation(operation, ({ variables: vars }) => {
      variables(vars);
      return HttpResponse.json({ errors: [{ message: 'boom' }] });
    })
  );
  return { variables };
}
