import { arrayMove } from '@dnd-kit/sortable';
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

// Attached to every draggable and droppable. Cards and cells carry their
// cell, so a drop resolves to one without looking the target up again.
type CellDragData = { type: 'card' | 'cell'; cell: PlotCell };
export type PlotDragData = CellDragData | { type: 'plotline' | 'beat' };
export type PlotDragType = 'card' | 'plotline' | 'beat';

interface DropTarget {
  id: UniqueIdentifier;
  data: CellDragData;
}

// One DndContext serves cards, rows and columns; while one kind is dragged,
// the other kinds' targets are disabled.
export function acceptsDrop(
  dragging: PlotDragType | null,
  target: PlotDragData['type']
): boolean {
  if (dragging === null) return true;
  return dragging === 'card'
    ? target === 'card' || target === 'cell'
    : target === dragging;
}

export function reorderedIds(
  ids: readonly string[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier
): string[] | null {
  const from = ids.indexOf(String(activeId));
  const to = ids.indexOf(String(overId));
  if (from === -1 || to === -1 || from === to) return null;
  return arrayMove([...ids], from, to);
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
  if (!over || !data || !('cell' in data)) return null;
  return { id: over.id, data };
}

export function dragTypeOf(active: Active): PlotDragType | null {
  const type = (active.data.current as PlotDragData | undefined)?.type;
  return type === 'card' || type === 'plotline' || type === 'beat'
    ? type
    : null;
}

export function plotAnnouncements(plot: Plot): Announcements {
  const cards = cardAnnouncements(plot);
  const plotlines = orderAnnouncements('plotline', plot.plotlines);
  const beats = orderAnnouncements('beat', plot.beats);
  const pick = (active: Active) => {
    const type = dragTypeOf(active);
    return type === 'plotline' ? plotlines : type === 'beat' ? beats : cards;
  };

  return {
    onDragStart: (args) => pick(args.active).onDragStart(args),
    onDragOver: (args) => pick(args.active).onDragOver(args),
    onDragEnd: (args) => pick(args.active).onDragEnd(args),
    onDragCancel: (args) => pick(args.active).onDragCancel(args),
  };
}

function orderAnnouncements(
  noun: 'plotline' | 'beat',
  rows: readonly { id: string; name: string }[]
): Announcements {
  const Noun = noun === 'plotline' ? 'Plotline' : 'Beat';
  const ids = rows.map((r) => r.id);
  const name = (active: Active) =>
    `'${rows.find((r) => r.id === active.id)?.name}'`;
  const at = (id: UniqueIdentifier) =>
    `position ${ids.indexOf(String(id)) + 1} of ${ids.length}`;

  return {
    onDragStart: ({ active }) =>
      `Picked up ${noun} ${name(active)}, ${at(active.id)}.`,
    onDragOver: ({ active, over }) => {
      if (over?.id === active.id) return undefined;
      return over
        ? `${Noun} ${name(active)} is over ${at(over.id)}.`
        : `${Noun} ${name(active)} is not over a ${noun}.`;
    },
    onDragEnd: ({ active, over }) =>
      over && over.id !== active.id
        ? `${Noun} ${name(active)} was dropped at ${at(over.id)}.`
        : `${Noun} ${name(active)} was dropped back at ${at(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Moving ${noun} ${name(active)} was cancelled. It stays at ${at(active.id)}.`,
  };
}

function cardAnnouncements(plot: Plot): Announcements {
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
