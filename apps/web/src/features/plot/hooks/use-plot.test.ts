import { describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { usePlot } from '@web/features/plot/hooks/use-plot';
import { server } from '@web/test/mocks/server';
import {
  MOCK_PLOTLINES,
  MOCK_PLOT_BEATS,
  MOCK_PROJECT,
} from '@web/test/mocks/fixtures';
import { renderHookWithProviders } from '@web/test/test-utils';

describe('usePlot', () => {
  it("returns the project's plotlines and beats in order", async () => {
    const { result } = renderHookWithProviders(() => usePlot(MOCK_PROJECT.id));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      plotlines: MOCK_PLOTLINES,
      beats: MOCK_PLOT_BEATS,
    });
  });

  it('asks for the given project only', async () => {
    const variables = vi.fn();
    server.use(
      graphql.query('GetPlot', ({ variables: vars }) => {
        variables(vars);
        return HttpResponse.json({
          data: { allPlotlines: { nodes: [] }, allPlotBeats: { nodes: [] } },
        });
      })
    );

    const { result } = renderHookWithProviders(() => usePlot('other-project'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(variables).toHaveBeenCalledWith({ projectId: 'other-project' });
    expect(result.current.data).toEqual({ plotlines: [], beats: [] });
  });

  it('does not fetch without a project', async () => {
    const { result } = renderHookWithProviders(() => usePlot(undefined));

    // Give a fetch every chance to fire before asserting it never did.
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('surfaces a failed request as an error', async () => {
    server.use(
      graphql.query('GetPlot', () =>
        HttpResponse.json({ errors: [{ message: 'boom' }] })
      )
    );

    const { result } = renderHookWithProviders(() => usePlot(MOCK_PROJECT.id));

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 5000,
    });
  });
});
