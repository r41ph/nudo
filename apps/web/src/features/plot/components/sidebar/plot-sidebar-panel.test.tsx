import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { delay, graphql, HttpResponse } from 'msw';
import { PlotSidebarPanel } from '@web/features/plot/components/sidebar/plot-sidebar-panel';
import { server } from '@web/test/mocks/server';
import {
  MOCK_PLOTLINES,
  MOCK_PLOT_BEATS,
  MOCK_PROJECT,
} from '@web/test/mocks/fixtures';
import { renderWithProviders } from '@web/test/test-utils';

const EMPTY_PROJECT_ID = '11111111-2222-4333-8444-555555555555';

function renderPanel(projectId: string = MOCK_PROJECT.id) {
  return renderWithProviders(<PlotSidebarPanel />, {
    initialRoute: `/project/${projectId}/plot`,
    routePath: '/project/:projectId/plot',
  });
}

const rowTexts = (list: HTMLElement) =>
  within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent);

describe('PlotSidebarPanel', () => {
  it('lists the plotlines with their card counts, in order', async () => {
    renderPanel();

    const list = await screen.findByRole('list', { name: 'Plotlines' });
    expect(rowTexts(list)).toEqual(['Main plot33 cards', 'Ada11 card']);
  });

  it('lists the beats in order, without counts', async () => {
    renderPanel();

    const list = await screen.findByRole('list', { name: 'Beats' });
    expect(rowTexts(list)).toEqual(MOCK_PLOT_BEATS.map((b) => b.name));
  });

  it('shows the totals in a status region', async () => {
    renderPanel();

    expect(await screen.findByRole('status')).toHaveTextContent(
      `${MOCK_PLOTLINES.length} plotlines · ${MOCK_PLOT_BEATS.length} beats · 4 cards`
    );
  });

  it('disables Show all while nothing is hidden', async () => {
    renderPanel();

    expect(
      await screen.findByRole('button', { name: 'Show all plotlines' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Show all beats' })
    ).toBeDisabled();
  });

  // jsdom has no layout; this locks the classes the independent scroll
  // relies on (spec §5), and the e2e test checks the scrolling itself.
  it('gives each list its own scroller', async () => {
    renderPanel();

    for (const name of ['Plotlines', 'Beats']) {
      const list = await screen.findByRole('list', { name });
      expect(list).toHaveClass('min-h-0', 'overflow-y-auto');
    }
  });

  it('shows placeholder rows while the plot loads', async () => {
    server.use(
      graphql.query('GetPlot', async () => {
        await delay('infinite');
        return HttpResponse.json({});
      })
    );
    renderPanel();

    expect(
      await screen.findByLabelText('Loading plotlines and beats')
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('stays empty when the plot fails to load, leaving the board to explain', async () => {
    server.use(
      graphql.query('GetPlot', () =>
        HttpResponse.json({ errors: [{ message: 'boom' }] })
      )
    );
    const { container } = renderPanel();

    await waitFor(() =>
      expect(
        screen.queryByLabelText('Loading plotlines and beats')
      ).not.toBeInTheDocument()
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows only the counter before the plot is started', async () => {
    renderPanel(EMPTY_PROJECT_ID);

    expect(await screen.findByRole('status')).toHaveTextContent(
      '0 plotlines · 0 beats · 0 cards'
    );
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
