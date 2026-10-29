import { PlusIcon } from 'lucide-react';
import { Button } from '@ui/components/ui/button';
import { cn } from '@ui/lib/utils';
import { BeatHeader } from '@web/features/plot/components/board/beat-header';
import { PlotHeader } from '@web/features/plot/components/board/plot-header';
import { PlotlineLabel } from '@web/features/plot/components/board/plotline-label';
import {
  PLOT_BEAT_COLUMN_WIDTH,
  PLOT_LABEL_COLUMN_WIDTH,
  PLOT_VIEW_ONLY_MESSAGE,
} from '@web/features/plot/constants/plot.constants';
import { usePlotEditable } from '@web/features/plot/hooks/use-plot-editable';
import { usePlotMutations } from '@web/features/plot/hooks/use-plot-mutations';
import { moveId } from '@web/features/plot/lib/plot.utils';
import type { Plot } from '@web/features/plot/plot.types';

interface PlotBoardProps {
  projectId: string;
  plot: Plot;
}

// The scroller's left gutter would show cells sliding past the sticky label
// column; this shadow paints the page background over it.
const COVER_GUTTER = 'shadow-[-2.5rem_0_0_0_var(--background)]';

export function PlotBoard({ projectId, plot }: PlotBoardProps) {
  const {
    addBeat,
    addPlotline,
    updatePlotline,
    reorderPlotlines,
    deletePlotline,
    updateBeat,
    reorderBeats,
    deleteBeat,
  } = usePlotMutations(projectId);
  const editable = usePlotEditable();
  const plotlineIds = plot.plotlines.map((p) => p.id);
  const beatIds = plot.beats.map((b) => b.id);
  const gridTemplateColumns = `${PLOT_LABEL_COLUMN_WIDTH}px repeat(${plot.beats.length}, ${PLOT_BEAT_COLUMN_WIDTH}px)`;

  return (
    <div className="flex h-svh min-w-0 flex-1 flex-col">
      <PlotHeader
        plotlineCount={plot.plotlines.length}
        beatCount={plot.beats.length}
        cardCount={0}
        editable={editable}
        onAddBeat={addBeat}
        onAddPlotline={addPlotline}
      />
      {!editable && (
        <p className="mx-10 mb-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {PLOT_VIEW_ONLY_MESSAGE}
        </p>
      )}
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
            {plot.beats.map((beat, index) => (
              <BeatHeader
                key={beat.id}
                beat={beat}
                editable={editable}
                isFirst={index === 0}
                isLast={index === plot.beats.length - 1}
                onRename={(name) => updateBeat(beat.id, { name })}
                onMove={(delta) =>
                  reorderBeats(moveId(beatIds, beat.id, delta))
                }
                onDelete={() => deleteBeat(beat)}
                className="sticky top-0 z-10"
              />
            ))}
          </div>
          {plot.plotlines.map((plotline, index) => (
            <div key={plotline.id} role="row" className="contents">
              <PlotlineLabel
                plotline={plotline}
                editable={editable}
                isFirst={index === 0}
                isLast={index === plot.plotlines.length - 1}
                onRename={(name) => updatePlotline(plotline.id, { name })}
                onColorChange={(color) =>
                  updatePlotline(plotline.id, { color })
                }
                onMove={(delta) =>
                  reorderPlotlines(moveId(plotlineIds, plotline.id, delta))
                }
                onDelete={() => deletePlotline(plotline)}
                className={cn('sticky left-0 z-10 col-start-1', COVER_GUTTER)}
              />
            </div>
          ))}
        </div>
        {editable && (
          <Button
            variant="ghost"
            size="sm"
            className="sticky left-0 mt-2"
            onClick={addPlotline}
          >
            <PlusIcon aria-hidden />
            Plotline
          </Button>
        )}
      </div>
    </div>
  );
}
