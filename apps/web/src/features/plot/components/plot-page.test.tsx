import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { graphql, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { PlotPage } from '@web/features/plot/components/plot-page';
import {
  PLOT_EDIT_MIN_WIDTH,
  PLOT_SAVE_ERROR,
  PLOT_SAVE_ERROR_ID,
} from '@web/features/plot/constants/plot.constants';
import { setViewportWidth } from '@web/test/media';
import { server } from '@web/test/mocks/server';
import {
  MOCK_PLOTLINES,
  MOCK_PLOT_BEATS,
  MOCK_PROJECT,
} from '@web/test/mocks/fixtures';
import { renderWithProviders } from '@web/test/test-utils';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}));

const EMPTY_PROJECT_ID = '11111111-2222-4333-8444-555555555555';

function renderPage(projectId: string = MOCK_PROJECT.id) {
  return renderWithProviders(<PlotPage />, {
    initialRoute: `/project/${projectId}/plot`,
    routePath: '/project/:projectId/plot',
  });
}

function deferred() {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  return { gate, release };
}

// Answers like the server would: empty until start_plot has run.
function serveStartablePlot(startPlot: () => Promise<Response> | Response) {
  let started = false;
  server.use(
    graphql.query('GetPlot', () =>
      HttpResponse.json({
        data: {
          allPlotlines: { nodes: started ? MOCK_PLOTLINES : [] },
          allPlotBeats: { nodes: started ? MOCK_PLOT_BEATS : [] },
        },
      })
    ),
    graphql.mutation('StartPlot', async () => {
      const response = await startPlot();
      started = response.ok && !(await response.clone().json()).errors;
      return response;
    })
  );
}

afterEach(() => {
  vi.mocked(toast.error).mockClear();
});

describe('PlotPage', () => {
  it('shows a skeleton while the plot loads', async () => {
    const { gate, release } = deferred();
    server.use(
      graphql.query('GetPlot', async () => {
        await gate;
        return HttpResponse.json({
          data: { allPlotlines: { nodes: [] }, allPlotBeats: { nodes: [] } },
        });
      })
    );

    renderPage();

    expect(screen.getByLabelText('Loading plot')).toBeInTheDocument();
    release();
    expect(await screen.findByText('Lay out your story')).toBeInTheDocument();
    expect(screen.queryByLabelText('Loading plot')).not.toBeInTheDocument();
  });

  it('shows an error with Retry, and Retry loads the plot', async () => {
    let fail = true;
    server.use(
      graphql.query('GetPlot', () =>
        fail
          ? HttpResponse.json({ errors: [{ message: 'boom' }] })
          : HttpResponse.json({
              data: {
                allPlotlines: { nodes: MOCK_PLOTLINES },
                allPlotBeats: { nodes: MOCK_PLOT_BEATS },
              },
            })
      )
    );

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load your plot."
    );
    expect(screen.queryByText('Lay out your story')).not.toBeInTheDocument();

    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByRole('heading', { name: 'Plot' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the empty state when the project has no plotlines and no beats', async () => {
    renderPage(EMPTY_PROJECT_ID);

    expect(
      await screen.findByRole('heading', { name: 'Lay out your story' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Plotlines run across, beats run down the page. Pin each idea where it belongs, like index cards on a desk.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start plot' })
    ).toBeInTheDocument();
  });

  it('hides Start plot on a narrow screen', async () => {
    setViewportWidth(PLOT_EDIT_MIN_WIDTH - 1);
    renderPage(EMPTY_PROJECT_ID);

    expect(
      await screen.findByRole('heading', { name: 'Lay out your story' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'View only — open nudo on a larger screen to edit the plot.'
      )
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Start plot' })).toBeNull();
  });

  it('shows the board, not the empty state, for a populated plot', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Plot' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Lay out your story')).not.toBeInTheDocument();
  });

  it('shows the board view-only on a narrow screen', async () => {
    setViewportWidth(PLOT_EDIT_MIN_WIDTH - 1);
    renderPage();

    expect(
      await screen.findByText(
        'View only — open nudo on a larger screen to edit the plot.'
      )
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Add beat' })).toBeNull();
  });

  it('Start plot shows a pending state, then the board', async () => {
    const { gate, release } = deferred();
    serveStartablePlot(async () => {
      await gate;
      return HttpResponse.json({
        data: { startPlot: { clientMutationId: null } },
      });
    });

    renderPage(EMPTY_PROJECT_ID);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start plot' })
    );

    const pending = await screen.findByRole('button', { name: 'Starting…' });
    expect(pending).toBeDisabled();

    release();

    expect(
      await screen.findByRole('heading', { name: 'Plot' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Lay out your story')).not.toBeInTheDocument();
  });

  it('stays on the empty state and shows the toast when Start plot fails', async () => {
    serveStartablePlot(() =>
      HttpResponse.json({ errors: [{ message: 'boom' }] })
    );

    renderPage(EMPTY_PROJECT_ID);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start plot' })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(PLOT_SAVE_ERROR, {
        id: PLOT_SAVE_ERROR_ID,
      })
    );
    expect(
      await screen.findByRole('button', { name: 'Start plot' })
    ).toBeEnabled();
    expect(screen.getByText('Lay out your story')).toBeInTheDocument();
  });
});
