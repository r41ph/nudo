import { PLOTLINE_COLORS } from '@web/features/plot/constants/plot.constants';
import type {
  Plot,
  PlotCard,
  PlotCell,
  PlotlineColor,
  PlotView,
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

// Unassigned cards sit in no plotline × beat cell, so they are never counted
// as visible.
export function visiblePlot(plot: Plot, view: PlotView): Plot {
  const hiddenPlotlines = new Set(view.hiddenPlotlineIds);
  const hiddenBeats = new Set(view.hiddenBeatIds);
  const plotlines = plot.plotlines.filter((p) => !hiddenPlotlines.has(p.id));
  const beats = plot.beats.filter((b) => !hiddenBeats.has(b.id));
  const plotlineIds = new Set(plotlines.map((p) => p.id));
  const beatIds = new Set(beats.map((b) => b.id));
  const cards = plot.cards.filter(
    (c) =>
      c.plotlineId !== null &&
      c.beatId !== null &&
      plotlineIds.has(c.plotlineId) &&
      beatIds.has(c.beatId)
  );
  return { plotlines, beats, cards };
}

export function plotCounterLabel(plot: Plot, view: PlotView): string {
  const visible = visiblePlot(plot, view);
  const filtered =
    visible.plotlines.length < plot.plotlines.length ||
    visible.beats.length < plot.beats.length;
  const part = (shown: number, total: number, noun: string) =>
    filtered
      ? `${shown} of ${countLabel(total, noun)}`
      : countLabel(total, noun);

  return [
    part(visible.plotlines.length, plot.plotlines.length, 'plotline'),
    part(visible.beats.length, plot.beats.length, 'beat'),
    countLabel(visible.cards.length, 'card'),
  ].join(' · ');
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
