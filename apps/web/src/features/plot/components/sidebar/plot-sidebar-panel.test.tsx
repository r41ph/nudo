import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, graphql, HttpResponse } from 'msw';
import { PlotSidebarPanel } from '@web/features/plot/components/sidebar/plot-sidebar-panel';
import { PLOT_EDIT_MIN_WIDTH } from '@web/features/plot/constants/plot.constants';
import { holdMutation } from '@web/features/plot/test/plot-board-harness';
import { setViewportWidth } from '@web/test/media';
import { server } from '@web/test/mocks/server';
import {
  MOCK_PLOTLINES,
  MOCK_PLOT_BEATS,
  MOCK_PROJECT,
} from '@web/test/mocks/fixtures';
import { renderWithProviders } from '@web/test/test-utils';

const EMPTY_PROJECT_ID = '11111111-2222-4333-8444-555555555555';

// jsdom implements no scrollIntoView; tests that need it install a spy.
const realScrollIntoView = Element.prototype.scrollIntoView;
afterEach(() => {
  Element.prototype.scrollIntoView = realScrollIntoView;
});

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
    expect(rowTexts(list)).toEqual([
      'Main plot33 cards',
      'Ada11 card',
      'New plotline',
    ]);
  });

  it('lists the beats in order, without counts', async () => {
    renderPanel();

    const list = await screen.findByRole('list', { name: 'Beats' });
    expect(rowTexts(list)).toEqual([
      ...MOCK_PLOT_BEATS.map((b) => b.name),
      'New beat',
    ]);
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

  it.each([
    ['New plotline', 'Plotlines', 'Untitled plotline', 'CreatePlotline'],
    ['New beat', 'Beats', 'Untitled beat', 'CreatePlotBeat'],
  ])(
    '%s adds a visible item and scrolls it into view',
    async (button, listName, itemName, operation) => {
      // Held, so the settle refetch of the unchanged fixture can't remove
      // the optimistic item before it is checked.
      const { release } = holdMutation(operation);
      const scrolled: Element[] = [];
      Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
        scrolled.push(this);
      });
      renderPanel();

      await userEvent.click(
        await screen.findByRole('button', { name: button })
      );

      const list = screen.getByRole('list', { name: listName });
      const row = (await within(list).findByText(itemName)).closest('li')!;
      const items = within(list).getAllByRole('listitem');
      // The New row stays last; the new item lands just above it.
      expect(items.at(-2)).toBe(row);
      await waitFor(() => expect(scrolled).toContain(row));
      release();
    }
  );

  it('shows every item ticked, named after what it shows', async () => {
    renderPanel();

    for (const { name } of [...MOCK_PLOTLINES, ...MOCK_PLOT_BEATS]) {
      expect(
        await screen.findByRole('checkbox', { name: `Show ${name}` })
      ).toBeChecked();
    }
  });

  it('hides an item from its checkbox, muting its name and the counter', async () => {
    renderPanel();

    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Show Main plot' })
    );

    expect(
      screen.getByRole('checkbox', { name: 'Show Main plot' })
    ).not.toBeChecked();
    const list = screen.getByRole('list', { name: 'Plotlines' });
    expect(within(list).getByText('Main plot')).toHaveClass(
      'text-muted-foreground'
    );
    expect(within(list).getByText('Ada')).toHaveClass('text-foreground');
    // Only Ada × End is left on the board.
    expect(screen.getByRole('status')).toHaveTextContent(
      '1 of 2 plotlines · 3 of 3 beats · 1 card'
    );
  });

  it('toggles from anywhere on the name, not only the box', async () => {
    renderPanel();
    const list = await screen.findByRole('list', { name: 'Beats' });

    await userEvent.click(within(list).getByText('Middle'));

    expect(
      screen.getByRole('checkbox', { name: 'Show Middle' })
    ).not.toBeChecked();
  });

  it('Show all restores its own section only', async () => {
    renderPanel();
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Show Ada' })
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show End' }));

    const showAllPlotlines = screen.getByRole('button', {
      name: 'Show all plotlines',
    });
    expect(showAllPlotlines).toBeEnabled();
    await userEvent.click(showAllPlotlines);

    expect(screen.getByRole('checkbox', { name: 'Show Ada' })).toBeChecked();
    expect(showAllPlotlines).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: 'Show End' })
    ).not.toBeChecked();
  });

  // A fresh render starts a new Jotai store, so this is the reload path:
  // the filter comes back from storage.
  it('keeps the filter after the panel unmounts and mounts again', async () => {
    const { unmount } = renderPanel();
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Show Ada' })
    );
    unmount();

    renderPanel();

    expect(
      await screen.findByRole('checkbox', { name: 'Show Ada' })
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Show Main plot' })
    ).toBeChecked();
  });

  it('keeps the filter per project', async () => {
    const { unmount } = renderPanel();
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Show Ada' })
    );
    unmount();

    renderPanel(EMPTY_PROJECT_ID);

    expect(await screen.findByRole('status')).toHaveTextContent(
      '0 plotlines · 0 beats · 0 cards'
    );
  });

  it('still filters when the plot is view-only', async () => {
    setViewportWidth(PLOT_EDIT_MIN_WIDTH - 1);
    renderPanel();

    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Show Ada' })
    );
    expect(
      screen.getByRole('checkbox', { name: 'Show Ada' })
    ).not.toBeChecked();

    await userEvent.click(
      screen.getByRole('button', { name: 'Show all plotlines' })
    );
    expect(screen.getByRole('checkbox', { name: 'Show Ada' })).toBeChecked();
  });

  it('offers no New rows when the plot is view-only', async () => {
    setViewportWidth(PLOT_EDIT_MIN_WIDTH - 1);
    renderPanel();

    await screen.findByRole('list', { name: 'Plotlines' });
    expect(screen.queryByRole('button', { name: 'New plotline' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'New beat' })).toBeNull();
  });

  it('shows only the counter before the plot is started', async () => {
    renderPanel(EMPTY_PROJECT_ID);

    expect(await screen.findByRole('status')).toHaveTextContent(
      '0 plotlines · 0 beats · 0 cards'
    );
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
