import { useEffect, useState } from 'react';
import { PLOT_FILTER_SETTLE_MS } from '@web/features/plot/constants/plot.constants';
import {
  isSettled,
  NO_PRESENCE,
  nextPresence,
  withPresence,
  type Presence,
} from '@web/features/plot/lib/plot-presence';
import type { Plot, PlotView } from '@web/features/plot/plot.types';

interface PlotPresence {
  plotlines: Presence;
  beats: Presence;
}

const SETTLED: PlotPresence = { plotlines: NO_PRESENCE, beats: NO_PRESENCE };

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Hidden rows and columns stay mounted until they have folded away, and
// returning ones are flagged so they open from nothing. One timer settles
// everything: a fully folded item lingering a little longer costs nothing.
export function usePlotPresence(plot: Plot, view: PlotView) {
  const [prevView, setPrevView] = useState(view);
  const [presence, setPresence] = useState(SETTLED);

  if (view !== prevView) {
    setPrevView(view);
    setPresence(
      prefersReducedMotion()
        ? SETTLED
        : {
            plotlines: nextPresence(
              presence.plotlines,
              prevView.hiddenPlotlineIds,
              view.hiddenPlotlineIds
            ),
            beats: nextPresence(
              presence.beats,
              prevView.hiddenBeatIds,
              view.hiddenBeatIds
            ),
          }
    );
  }

  useEffect(() => {
    if (isSettled(presence.plotlines) && isSettled(presence.beats)) return;
    const timer = setTimeout(() => setPresence(SETTLED), PLOT_FILTER_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [presence]);

  return {
    plotlines: withPresence(
      plot.plotlines,
      view.hiddenPlotlineIds,
      presence.plotlines
    ),
    beats: withPresence(plot.beats, view.hiddenBeatIds, presence.beats),
  };
}
