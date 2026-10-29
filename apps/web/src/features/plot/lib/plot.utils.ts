import { PLOTLINE_COLORS } from '@web/features/plot/constants/plot.constants';
import type { PlotlineColor } from '@web/features/plot/plot.types';

// Least-used key, earliest in palette order on a tie: on a board with fewer
// than seven plotlines that is the first unused key, and after that the
// palette cycles round evenly.
export function nextPlotlineColor(
  used: readonly PlotlineColor[]
): PlotlineColor {
  const counts = new Map<PlotlineColor, number>(
    PLOTLINE_COLORS.map((c) => [c, 0])
  );
  for (const color of used) counts.set(color, (counts.get(color) ?? 0) + 1);

  let best: PlotlineColor = PLOTLINE_COLORS[0];
  for (const color of PLOTLINE_COLORS) {
    if (counts.get(color)! < counts.get(best)!) best = color;
  }
  return best;
}

export function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
