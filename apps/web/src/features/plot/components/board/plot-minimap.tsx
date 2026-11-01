import { useRef, type RefObject } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ui/components/ui/tooltip';
import { cn } from '@ui/lib/utils';
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
  usePlotMinimapFrame,
  usePlotMinimapKeys,
  usePlotMinimapPointer,
  usePlotMinimapPosition,
  usePlotMinimapWheel,
  type MinimapSnapshot,
} from '@web/features/plot/hooks/use-plot-minimap';
import { markRect, minimapScale } from '@web/features/plot/lib/plot-minimap';
import type { Plot, PlotlineColor } from '@web/features/plot/plot.types';

// The box is w-fit around the miniature, so PLOT_MINIMAP_WIDTH is its widest:
// the miniature's limit is that minus px-3 and the 1px border on each side.
const INNER_WIDTH = PLOT_MINIMAP_WIDTH - 2 * 12 - 2 * 1;

interface PlotMinimapProps {
  containerRef: RefObject<HTMLElement | null>;
  scrollContainerId: string;
  gridRef: RefObject<HTMLElement | null>;
  // The visible plot, as the board renders it.
  plot: Plot;
  // A card, beat or plotline drag is in progress.
  dragging: boolean;
}

export function PlotMinimap({
  containerRef,
  scrollContainerId,
  gridRef,
  plot,
  dragging,
}: PlotMinimapProps) {
  const editable = usePlotEditable();
  const snapshot = usePlotMinimap(
    containerRef,
    gridRef,
    minimapSignature(plot, editable)
  );
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const layout = snapshot?.layout ?? null;
  const scale = layout
    ? minimapScale(layout, INNER_WIDTH, PLOT_MINIMAP_MAX_HEIGHT)
    : 0;
  usePlotMinimapFrame(containerRef, frameRef, layout, scale);
  const pointer = usePlotMinimapPointer(containerRef, frameRef, layout, scale);
  usePlotMinimapWheel(containerRef, boxRef, layout !== null);
  const keys = usePlotMinimapKeys(containerRef, snapshot);
  if (!snapshot || !layout) return null;

  const plotlineColors = new Map(plot.plotlines.map((p) => [p.id, p.color]));
  const cardColors = new Map<string, PlotlineColor | undefined>(
    plot.cards.map((c) => [c.id, plotlineColors.get(c.plotlineId ?? '')])
  );

  return (
    <div
      ref={boxRef}
      data-testid="plot-minimap"
      className={cn(
        'absolute right-6 bottom-5 z-30 w-fit rounded-lg border border-border bg-popover px-3 py-2.5 shadow-lg select-none dark:border-foreground/15 dark:bg-[color-mix(in_oklab,var(--card),var(--foreground)_10%)] dark:shadow-black/45',
        // Keeps drops possible under the minimap.
        dragging && 'pointer-events-none opacity-40'
      )}
      style={{
        marginRight: snapshot.scrollbar.right,
        marginBottom: snapshot.scrollbar.bottom,
      }}
    >
      {/* touch-none: a touch drag moves the frame instead of panning. */}
      <div className="relative w-fit touch-none" {...pointer}>
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
        {/* Not inside the aria-hidden miniature: the frame is the accessible
            control. */}
        {/* The app mounts no TooltipProvider, and Radix requires one. */}
        <TooltipProvider>
          <Tooltip>
            {/* A styled div: no UI component is a two-axis scroll control. */}
            <TooltipTrigger asChild>
              <div
                ref={frameRef}
                data-testid="plot-minimap-frame"
                tabIndex={0}
                role="group"
                aria-roledescription="minimap"
                aria-label="Board position"
                aria-controls={scrollContainerId}
                onKeyDown={keys.onKeyDown}
                className="absolute top-0 left-0 cursor-grab rounded-[3px] bg-foreground/8 outline-foreground/60 hover:outline-[1.5px] focus-visible:outline-[1.5px] data-dragging:cursor-grabbing data-dragging:outline-[1.5px] dark:bg-foreground/10"
              />
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              <PositionText containerRef={containerRef} snapshot={snapshot} />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div role="status" className="sr-only">
        {keys.announcement}
      </div>
    </div>
  );
}

// Its own component so that only the open tooltip re-renders on scroll.
function PositionText({
  containerRef,
  snapshot,
}: {
  containerRef: RefObject<HTMLElement | null>;
  snapshot: MinimapSnapshot;
}) {
  return usePlotMinimapPosition(containerRef, snapshot);
}
