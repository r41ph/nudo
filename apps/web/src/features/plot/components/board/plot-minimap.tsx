import type { RefObject } from 'react';
import {
  PLOTLINE_COLOR_VAR,
  PLOT_MINIMAP_MARK_MIN_HEIGHT,
  PLOT_MINIMAP_MARK_MIN_WIDTH,
  PLOT_MINIMAP_MAX_HEIGHT,
  PLOT_MINIMAP_WIDTH,
} from '@web/features/plot/constants/plot.constants';
import { usePlotEditable } from '@web/features/plot/hooks/use-plot-editable';
import {
  minimapSignature,
  usePlotMinimap,
} from '@web/features/plot/hooks/use-plot-minimap';
import { markRect, minimapScale } from '@web/features/plot/lib/plot-minimap';
import type { Plot, PlotlineColor } from '@web/features/plot/plot.types';

// w-64 is PLOT_MINIMAP_WIDTH; the content box loses px-3 and the 1px border
// on each side.
const INNER_WIDTH = PLOT_MINIMAP_WIDTH - 2 * 12 - 2 * 1;

interface PlotMinimapProps {
  containerRef: RefObject<HTMLElement | null>;
  gridRef: RefObject<HTMLElement | null>;
  // The visible plot, as the board renders it.
  plot: Plot;
}

export function PlotMinimap({ containerRef, gridRef, plot }: PlotMinimapProps) {
  const editable = usePlotEditable();
  const snapshot = usePlotMinimap(
    containerRef,
    gridRef,
    minimapSignature(plot, editable)
  );
  if (!snapshot) return null;

  const { layout } = snapshot;
  const scale = minimapScale(layout, INNER_WIDTH, PLOT_MINIMAP_MAX_HEIGHT);
  const plotlineColors = new Map(plot.plotlines.map((p) => [p.id, p.color]));
  const cardColors = new Map<string, PlotlineColor | undefined>(
    plot.cards.map((c) => [c.id, plotlineColors.get(c.plotlineId ?? '')])
  );

  return (
    <div
      data-testid="plot-minimap"
      className="absolute right-6 bottom-5 z-30 w-64 rounded-lg border border-border bg-popover px-3 py-2.5 shadow-lg dark:shadow-black/45"
      style={{
        marginRight: snapshot.scrollbar.right,
        marginBottom: snapshot.scrollbar.bottom,
      }}
    >
      <div
        data-testid="plot-minimap-miniature"
        aria-hidden
        className="relative"
        style={{
          width: layout.regionWidth * scale,
          height: layout.regionHeight * scale,
        }}
      >
        {snapshot.marks.map(({ cardId, rect }) => {
          const color = cardColors.get(cardId);
          if (!color) return null;
          const mark = markRect(
            rect,
            scale,
            PLOT_MINIMAP_MARK_MIN_WIDTH,
            PLOT_MINIMAP_MARK_MIN_HEIGHT
          );
          return (
            <div
              key={cardId}
              data-testid="plot-minimap-mark"
              className="absolute rounded-[1px] opacity-55 dark:opacity-80"
              style={{
                left: mark.x,
                top: mark.y,
                width: mark.width,
                height: mark.height,
                backgroundColor: PLOTLINE_COLOR_VAR[color],
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
