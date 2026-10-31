import { useState } from 'react';
import { Skeleton } from '@ui/components/ui/skeleton';
import { PlotCounter } from '@web/features/plot/components/sidebar/plot-counter';
import {
  PlotFilterNewRow,
  PlotFilterRow,
} from '@web/features/plot/components/sidebar/plot-filter-row';
import { PlotFilterSection } from '@web/features/plot/components/sidebar/plot-filter-section';
import { PLOTLINE_COLOR_VAR } from '@web/features/plot/constants/plot.constants';
import { usePlot } from '@web/features/plot/hooks/use-plot';
import { usePlotEditable } from '@web/features/plot/hooks/use-plot-editable';
import { usePlotMutations } from '@web/features/plot/hooks/use-plot-mutations';
import { plotCounterLabel } from '@web/features/plot/lib/plot.utils';
import { usePlotView } from '@web/features/plot/state/plot-view.store';
import { useProjectId } from '@web/shared/hooks/use-project-id';

export function PlotSidebarPanel() {
  const projectId = useProjectId()!;
  const { data: plot, isPending } = usePlot(projectId);
  const { view, toggle, showAll, isHidden } = usePlotView(projectId);
  const { addPlotline, addBeat } = usePlotMutations(projectId);
  const editable = usePlotEditable();
  const [createdId, setCreatedId] = useState<string | null>(null);

  if (isPending) {
    return (
      <div
        aria-label="Loading plotlines and beats"
        className="flex flex-col gap-2 px-2.5"
      >
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-6.5 w-full" />
        ))}
      </div>
    );
  }

  // The board shows the error and its Retry; repeating it here would offer
  // two buttons for one failure.
  if (!plot) return null;

  // Starting a plot stays on the board's empty state, so there is nothing to
  // list or add yet.
  const started = plot.plotlines.length > 0 || plot.beats.length > 0;
  const cardCount = (plotlineId: string) =>
    plot.cards.filter((card) => card.plotlineId === plotlineId).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5">
      {started && (
        <>
          <PlotFilterSection
            label="Plotlines"
            canShowAll={plot.plotlines.some((p) => isHidden('plotline', p.id))}
            onShowAll={() => showAll('plotline')}
          >
            {plot.plotlines.map((plotline) => (
              <PlotFilterRow
                key={plotline.id}
                name={plotline.name}
                visible={!isHidden('plotline', plotline.id)}
                onToggle={() => toggle('plotline', plotline.id)}
                color={PLOTLINE_COLOR_VAR[plotline.color]}
                cardCount={cardCount(plotline.id)}
                scrollIntoViewOnMount={plotline.id === createdId}
              />
            ))}
            {editable && (
              <PlotFilterNewRow
                label="New plotline"
                onClick={() => setCreatedId(addPlotline())}
              />
            )}
          </PlotFilterSection>
          <PlotFilterSection
            label="Beats"
            canShowAll={plot.beats.some((b) => isHidden('beat', b.id))}
            onShowAll={() => showAll('beat')}
          >
            {plot.beats.map((beat) => (
              <PlotFilterRow
                key={beat.id}
                name={beat.name}
                visible={!isHidden('beat', beat.id)}
                onToggle={() => toggle('beat', beat.id)}
                scrollIntoViewOnMount={beat.id === createdId}
              />
            ))}
            {editable && (
              <PlotFilterNewRow
                label="New beat"
                onClick={() => setCreatedId(addBeat())}
              />
            )}
          </PlotFilterSection>
        </>
      )}
      <PlotCounter label={plotCounterLabel(plot, view)} />
    </div>
  );
}
