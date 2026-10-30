import { PLOTLINE_COLORS } from '@web/features/plot/constants/plot.constants';
import type {
  PlotCard,
  PlotCell,
  PlotlineColor,
} from '@web/features/plot/plot.types';

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

export function moveId(ids: readonly string[], id: string, delta: -1 | 1) {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= ids.length) return [...ids];
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

const UNASSIGNED_KEY = 'unassigned';

export function cellKey({ plotlineId, beatId }: PlotCell): string {
  return plotlineId === null ? UNASSIGNED_KEY : `${plotlineId}:${beatId}`;
}

export function groupCardsByCell(
  cards: readonly PlotCard[]
): Map<string, PlotCard[]> {
  const cells = new Map<string, PlotCard[]>();
  for (const card of cards) {
    const key = cellKey(card);
    const cell = cells.get(key);
    if (cell) cell.push(card);
    else cells.set(key, [card]);
  }
  for (const cell of cells.values())
    cell.sort((a, b) => a.position - b.position);
  return cells;
}

// Mirrors move_plot_card: the destination is renumbered from 0 in its new
// order, and the source cell is renumbered to close the gap.
export function applyCardMove(
  cards: readonly PlotCard[],
  cardId: string,
  to: PlotCell,
  index: number
): { cards: PlotCard[]; orderedIds: string[] } | null {
  const moved = cards.find((c) => c.id === cardId);
  if (!moved) return null;

  const cells = groupCardsByCell(cards.filter((c) => c.id !== cardId));
  const destination = [...(cells.get(cellKey(to)) ?? [])];
  destination.splice(Math.min(index, destination.length), 0, {
    ...moved,
    plotlineId: to.plotlineId,
    beatId: to.beatId,
  });

  const updates = new Map<string, PlotCard>();
  const renumber = (cell: readonly PlotCard[]) =>
    cell.forEach((c, position) => updates.set(c.id, { ...c, position }));
  renumber(destination);
  if (cellKey(moved) !== cellKey(to)) renumber(cells.get(cellKey(moved)) ?? []);

  return {
    cards: cards.map((c) => updates.get(c.id) ?? c),
    orderedIds: destination.map((c) => c.id),
  };
}
