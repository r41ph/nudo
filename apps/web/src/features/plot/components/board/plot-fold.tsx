import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { cn } from '@ui/lib/utils';
import type { PresencePhase } from '@web/features/plot/lib/plot-presence';

interface PlotFoldProps {
  // A plotline's phase folds the height; a beat's folds the width.
  row?: PresencePhase;
  column?: PresencePhase;
  // Fixed so content keeps its layout while the column narrows around it.
  width?: number;
  className?: string;
  children: ReactNode;
}

// Leaving: content fades and lifts, then the space closes behind it.
// Entering: the space opens, and content settles in once it is partly open.
// PLOT_FILTER_SETTLE_MS covers the longer of the two; change them together.
const FOLD =
  'grid transition-[grid-template-rows,width] duration-650 ease-fold motion-reduce:transition-none';
const DRIFT =
  'grid min-h-0 transition-[opacity,translate] ease-in-out motion-reduce:transition-none';

// Folding content must render unchanged (a lost "Add card" button made the
// rows below jump), so it opts out of drops through this instead of props.
const FoldingContext = createContext(false);

export const useIsFolding = () => useContext(FoldingContext);

export function PlotFold({
  row = 'shown',
  column = 'shown',
  width,
  className,
  children,
}: PlotFoldProps) {
  const leaving = row === 'leaving' || column === 'leaving';
  const entering = !leaving && (row === 'entering' || column === 'entering');
  const hasWidth = width !== undefined;

  return (
    <div
      inert={leaving}
      className={cn(
        FOLD,
        row === 'leaving' ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
        row === 'entering' && 'starting:grid-rows-[0fr]',
        hasWidth && (column === 'leaving' ? 'w-0' : 'w-(--fold-width)'),
        hasWidth && column === 'entering' && 'starting:w-0',
        leaving && 'delay-260',
        // Clipping only while moving: at rest the plotline's reorder handle
        // sits outside the label, in the scroller's gutter.
        (leaving || entering) && 'overflow-hidden',
        className
      )}
      style={
        hasWidth
          ? ({ '--fold-width': `${width}px` } as CSSProperties)
          : undefined
      }
    >
      <div
        className={cn(
          DRIFT,
          leaving
            ? '-translate-y-1 opacity-0 duration-450'
            : 'duration-700 delay-260',
          entering && 'starting:-translate-y-1 starting:opacity-0'
        )}
        style={hasWidth ? { width } : undefined}
      >
        <FoldingContext value={leaving}>{children}</FoldingContext>
      </div>
    </div>
  );
}
