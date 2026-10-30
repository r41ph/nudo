import {
  closestCorners,
  pointerWithin,
  type Active,
  type Announcements,
  type CollisionDetection,
  type Over,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  applyCardMove,
  cellKey,
  groupCardsByCell,
} from '@web/features/plot/lib/plot.utils';
import type { Plot, PlotCard, PlotCell } from '@web/features/plot/plot.types';

// Attached to every card and cell, so a drop resolves to a cell without
// looking the target up again.
export interface PlotDragData {
  type: 'card' | 'cell';
  cell: PlotCell;
}

interface DropTarget {
  id: UniqueIdentifier;
  data: PlotDragData;
}

export function cellDroppableId(cell: PlotCell): string {
  return `cell:${cellKey(cell)}`;
}

// A card target takes the card's slot (before it, or after it when moving
// down its own cell, as arrayMove does); a cell target appends.
export function cardDrop(
  cards: readonly PlotCard[],
  cardId: UniqueIdentifier,
  over: DropTarget | null
): { to: PlotCell; orderedIds: string[]; moved: boolean } | null {
  const moving = cards.find((c) => c.id === cardId);
  if (!moving || !over) return null;

  const { plotlineId, beatId } = over.data.cell;
  const to: PlotCell = { plotlineId, beatId };
  const before = (groupCardsByCell(cards).get(cellKey(to)) ?? []).map(
    (c) => c.id
  );
  const index =
    over.data.type === 'card'
      ? before.indexOf(String(over.id))
      : Number.POSITIVE_INFINITY;
  const move = applyCardMove(cards, moving.id, to, index);
  if (!move) return null;

  const moved =
    cellKey(moving) !== cellKey(to) || before.join() !== move.orderedIds.join();
  return { to, orderedIds: move.orderedIds, moved };
}

// Under a pointer both a card and its cell contain it; the card is the more
// precise target. The keyboard has no pointer, and moves the dragged rect onto
// its target, so the closest corners find it exactly.
export const plotCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length === 0) return closestCorners(args);
  const cards = hits.filter(
    (hit) =>
      args.droppableContainers.find((c) => c.id === hit.id)?.data.current
        ?.type === 'card'
  );
  return cards.length > 0 ? cards : hits;
};

export function dropTargetOf(over: Over | null): DropTarget | null {
  const data = over?.data.current as PlotDragData | undefined;
  return over && data ? { id: over.id, data } : null;
}

export function cardAnnouncements(plot: Plot): Announcements {
  const find = (id: UniqueIdentifier) => plot.cards.find((c) => c.id === id);
  const name = (active: Active) =>
    `'${find(active.id)?.title || 'Untitled card'}'`;
  const where = (cell: PlotCell) => {
    const plotline = plot.plotlines.find((p) => p.id === cell.plotlineId);
    const beat = plot.beats.find((b) => b.id === cell.beatId);
    return `${plotline?.name}, ${beat?.name}`;
  };
  const landing = (active: Active, over: Over | null) => {
    const drop = cardDrop(plot.cards, active.id, dropTargetOf(over));
    if (!drop) return null;
    const position = drop.orderedIds.indexOf(String(active.id)) + 1;
    return `${where(drop.to)}, position ${position} of ${drop.orderedIds.length}`;
  };
  const home = (active: Active) => {
    const card = find(active.id);
    return card ? where(card) : '';
  };

  return {
    onDragStart: ({ active }) =>
      `Picked up card ${name(active)} in ${home(active)}.`,
    onDragOver: ({ active, over }) => {
      // Right after pick-up the card is over itself; keep the pick-up line.
      if (over?.id === active.id) return undefined;
      const at = landing(active, over);
      return at
        ? `Card ${name(active)} is over ${at}.`
        : `Card ${name(active)} is not over a cell.`;
    },
    onDragEnd: ({ active, over }) => {
      const at = landing(active, over);
      return at
        ? `Card ${name(active)} was dropped in ${at}.`
        : `Card ${name(active)} was dropped back in ${home(active)}.`;
    },
    onDragCancel: ({ active }) =>
      `Moving card ${name(active)} was cancelled. It stays in ${home(active)}.`,
  };
}
