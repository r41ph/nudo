import { PlusIcon } from 'lucide-react';
import { Button } from '@ui/components/ui/button';
import { cn } from '@ui/lib/utils';
import { PlotHeader } from '@web/features/plot/components/board/plot-header';
import {
  PLOT_BEAT_COLUMN_WIDTH,
  PLOT_LABEL_COLUMN_WIDTH,
  PLOTLINE_COLOR_DOT_CLASS,
} from '@web/features/plot/constants/plot.constants';
import { usePlotMutations } from '@web/features/plot/hooks/use-plot-mutations';
import { countLabel } from '@web/features/plot/lib/plot.utils';
import type { Plot } from '@web/features/plot/plot.types';

interface PlotBoardProps {
  projectId: string;
  plot: Plot;
}

// The scroller's left gutter would show cells sliding past the sticky label
// column; this shadow paints the page background over it.
const COVER_GUTTER = 'shadow-[-2.5rem_0_0_0_var(--background)]';

export function PlotBoard({ projectId, plot }: PlotBoardProps) {
  const { addBeat, addPlotline } = usePlotMutations(projectId);
  const gridTemplateColumns = `${PLOT_LABEL_COLUMN_WIDTH}px repeat(${plot.beats.length}, ${PLOT_BEAT_COLUMN_WIDTH}px)`;

  return (
    <div className="flex h-svh min-w-0 flex-1 flex-col">
      <PlotHeader
        plotlineCount={plot.plotlines.length}
        beatCount={plot.beats.length}
        cardCount={0}
        onAddBeat={addBeat}
        onAddPlotline={addPlotline}
      />
      <div className="min-h-0 flex-1 overflow-auto px-10 pb-8">
        <div
          role="table"
          aria-label="Plot board"
          className="grid w-max"
          style={{ gridTemplateColumns }}
        >
          <div role="row" className="contents">
            <div
              role="none"
              className={cn(
                'sticky top-0 left-0 z-20 border-b border-border bg-background',
                COVER_GUTTER
              )}
            />
            {plot.beats.map((beat) => (
              <div
                key={beat.id}
                role="columnheader"
                className="sticky top-0 z-10 truncate border-b border-border bg-background px-3 py-2 text-sm font-medium text-foreground"
              >
                {beat.name}
              </div>
            ))}
          </div>
          {plot.plotlines.map((plotline) => (
            <div key={plotline.id} role="row" className="contents">
              <div
                role="rowheader"
                className={cn(
                  'sticky left-0 z-10 col-start-1 flex min-h-24 items-start gap-2 border-b border-border bg-background py-3 pr-3',
                  COVER_GUTTER
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-1.5 size-2.5 shrink-0 rounded-full',
                    PLOTLINE_COLOR_DOT_CLASS[plotline.color]
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {plotline.name}
                </span>
                <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
                  {countLabel(0, 'card')}
                </span>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="sticky left-0 mt-2"
          onClick={addPlotline}
        >
          <PlusIcon aria-hidden />
          Plotline
        </Button>
      </div>
    </div>
  );
}
