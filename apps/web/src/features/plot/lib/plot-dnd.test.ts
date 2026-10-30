import { describe, expect, it } from 'vitest';
import type { Active, ClientRect, Over } from '@dnd-kit/core';
import {
  acceptsDrop,
  cardDrop,
  plotAnnouncements,
  reorderedIds,
  cellDroppableId,
  plotCollision,
} from '@web/features/plot/lib/plot-dnd';
import type { Plot, PlotCard, PlotCell } from '@web/features/plot/plot.types';

const MAIN = 'main';
const ADA = 'ada';
const START = 'start';
const MIDDLE = 'middle';

function card(
  id: string,
  plotlineId: string,
  beatId: string,
  position: number,
  title = id
): PlotCard {
  return { id, title, description: '', plotlineId, beatId, position };
}

const CARDS = [
  card('a', MAIN, START, 0, 'Arrival'),
  card('b', MAIN, START, 1, ''),
  card('c', MAIN, START, 2, 'Crossing'),
  card('d', MAIN, MIDDLE, 0, 'Discovery'),
];

const PLOT: Plot = {
  plotlines: [
    { id: MAIN, name: 'Main plot', color: 'color1', position: 0 },
    { id: ADA, name: 'Ada', color: 'color4', position: 1 },
  ],
  beats: [
    { id: START, name: 'Beginning', position: 0 },
    { id: MIDDLE, name: 'Middle', position: 1 },
  ],
  cards: CARDS,
};

const cell = (plotlineId: string, beatId: string): PlotCell => ({
  plotlineId,
  beatId,
});

function overCard(id: string) {
  const target = CARDS.find((c) => c.id === id)!;
  return { id, data: { type: 'card' as const, cell: target } };
}

function overCell(at: PlotCell) {
  return {
    id: cellDroppableId(at),
    data: { type: 'cell' as const, cell: at },
  };
}

describe('cardDrop', () => {
  it('reorders within a cell onto the hovered card’s slot', () => {
    expect(cardDrop(CARDS, 'a', overCard('c'))).toEqual({
      to: cell(MAIN, START),
      orderedIds: ['b', 'c', 'a'],
      moved: true,
    });
    expect(cardDrop(CARDS, 'c', overCard('a'))?.orderedIds).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('inserts before the hovered card in another cell', () => {
    expect(cardDrop(CARDS, 'b', overCard('d'))).toEqual({
      to: cell(MAIN, MIDDLE),
      orderedIds: ['b', 'd'],
      moved: true,
    });
  });

  it('appends when dropped on a cell rather than a card', () => {
    expect(cardDrop(CARDS, 'a', overCell(cell(MAIN, MIDDLE)))).toEqual({
      to: cell(MAIN, MIDDLE),
      orderedIds: ['d', 'a'],
      moved: true,
    });
    expect(
      cardDrop(CARDS, 'a', overCell(cell(ADA, START)))?.orderedIds
    ).toEqual(['a']);
  });

  it('is not a move when the card lands where it started', () => {
    expect(cardDrop(CARDS, 'b', overCard('b'))?.moved).toBe(false);
    expect(cardDrop(CARDS, 'c', overCell(cell(MAIN, START)))?.moved).toBe(
      false
    );
  });

  it('is null without a target or for an unknown card', () => {
    expect(cardDrop(CARDS, 'a', null)).toBeNull();
    expect(cardDrop(CARDS, 'zzz', overCard('a'))).toBeNull();
  });
});

describe('plotAnnouncements: cards', () => {
  const announce = plotAnnouncements(PLOT);
  const active = (id: string) =>
    ({ id, data: { current: { type: 'card' } } }) as unknown as Active;
  const over = (target: { id: string; data: unknown }) =>
    ({ id: target.id, data: { current: target.data } }) as unknown as Over;

  it('names the card and where it was picked up', () => {
    expect(announce.onDragStart({ active: active('a') })).toBe(
      "Picked up card 'Arrival' in Main plot, Beginning."
    );
    expect(announce.onDragStart({ active: active('b') })).toBe(
      "Picked up card 'Untitled card' in Main plot, Beginning."
    );
  });

  it('gives the cell and position it is over', () => {
    expect(
      announce.onDragOver({ active: active('a'), over: over(overCard('d')) })
    ).toBe("Card 'Arrival' is over Main plot, Middle, position 1 of 2.");
    expect(
      announce.onDragOver({
        active: active('a'),
        over: over(overCell(cell(ADA, START))),
      })
    ).toBe("Card 'Arrival' is over Ada, Beginning, position 1 of 1.");
    expect(announce.onDragOver({ active: active('a'), over: null })).toBe(
      "Card 'Arrival' is not over a cell."
    );
  });

  it('confirms where it was dropped', () => {
    expect(
      announce.onDragEnd({ active: active('a'), over: over(overCard('c')) })
    ).toBe(
      "Card 'Arrival' was dropped in Main plot, Beginning, position 3 of 3."
    );
    expect(announce.onDragEnd({ active: active('a'), over: null })).toBe(
      "Card 'Arrival' was dropped back in Main plot, Beginning."
    );
  });

  it('says a cancelled move left the card in place', () => {
    expect(announce.onDragCancel({ active: active('d'), over: null })).toBe(
      "Moving card 'Discovery' was cancelled. It stays in Main plot, Middle."
    );
  });
});

describe('plotAnnouncements: plotlines and beats', () => {
  const announce = plotAnnouncements(PLOT);
  const active = (id: string, type: 'plotline' | 'beat') =>
    ({ id, data: { current: { type } } }) as unknown as Active;
  const over = (id: string, type: 'plotline' | 'beat') =>
    ({ id, data: { current: { type } } }) as unknown as Over;

  it('names the plotline and its position', () => {
    expect(announce.onDragStart({ active: active(MAIN, 'plotline') })).toBe(
      "Picked up plotline 'Main plot', position 1 of 2."
    );
    expect(
      announce.onDragOver({
        active: active(MAIN, 'plotline'),
        over: over(ADA, 'plotline'),
      })
    ).toBe("Plotline 'Main plot' is over position 2 of 2.");
    expect(
      announce.onDragEnd({
        active: active(MAIN, 'plotline'),
        over: over(ADA, 'plotline'),
      })
    ).toBe("Plotline 'Main plot' was dropped at position 2 of 2.");
    expect(
      announce.onDragCancel({ active: active(MAIN, 'plotline'), over: null })
    ).toBe(
      "Moving plotline 'Main plot' was cancelled. It stays at position 1 of 2."
    );
  });

  it('names the beat and its position', () => {
    expect(announce.onDragStart({ active: active(MIDDLE, 'beat') })).toBe(
      "Picked up beat 'Middle', position 2 of 2."
    );
    expect(
      announce.onDragEnd({
        active: active(MIDDLE, 'beat'),
        over: over(START, 'beat'),
      })
    ).toBe("Beat 'Middle' was dropped at position 1 of 2.");
    expect(
      announce.onDragEnd({ active: active(MIDDLE, 'beat'), over: null })
    ).toBe("Beat 'Middle' was dropped back at position 2 of 2.");
  });
});

describe('reorderedIds', () => {
  it('moves the id onto the target’s slot', () => {
    expect(reorderedIds(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a']);
    expect(reorderedIds(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b']);
  });

  it('is null when nothing would change', () => {
    expect(reorderedIds(['a', 'b'], 'a', 'a')).toBeNull();
    expect(reorderedIds(['a', 'b'], 'a', 'zzz')).toBeNull();
  });
});

describe('acceptsDrop', () => {
  it('lets cards land on cards and cells, and rows and columns on their own kind', () => {
    expect(acceptsDrop('card', 'card')).toBe(true);
    expect(acceptsDrop('card', 'cell')).toBe(true);
    expect(acceptsDrop('plotline', 'plotline')).toBe(true);
    expect(acceptsDrop('beat', 'beat')).toBe(true);
    expect(acceptsDrop('plotline', 'cell')).toBe(false);
    expect(acceptsDrop('beat', 'plotline')).toBe(false);
    expect(acceptsDrop('card', 'beat')).toBe(false);
  });

  it('accepts anything while nothing is dragged', () => {
    expect(acceptsDrop(null, 'beat')).toBe(true);
  });
});

describe('plotCollision', () => {
  const rect = (left: number, top: number, width: number, height: number) =>
    ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
    }) as ClientRect;
  const startCell = cellDroppableId(cell(MAIN, START));
  const middleCell = cellDroppableId(cell(MAIN, MIDDLE));
  const rects = new Map([
    [startCell, rect(0, 0, 240, 200)],
    ['a', rect(8, 8, 224, 50)],
    [middleCell, rect(240, 0, 240, 200)],
  ]);
  const containers = [
    { id: startCell, type: 'cell' },
    { id: 'a', type: 'card' },
    { id: middleCell, type: 'cell' },
  ].map(({ id, type }) => ({ id, data: { current: { type } } }));

  function collide(
    pointerCoordinates: { x: number; y: number } | null,
    collisionRect: ClientRect
  ) {
    return plotCollision({
      active: { id: 'b' },
      collisionRect,
      droppableRects: rects,
      droppableContainers: containers,
      pointerCoordinates,
    } as unknown as Parameters<typeof plotCollision>[0]).map((c) => c.id);
  }

  it('prefers the card under the pointer over its cell', () => {
    expect(collide({ x: 20, y: 20 }, rect(10, 10, 224, 50))).toEqual(['a']);
  });

  it('falls back to the cell when the pointer is on empty space', () => {
    expect(collide({ x: 300, y: 150 }, rect(290, 140, 224, 50))).toEqual([
      middleCell,
    ]);
  });

  it('uses the closest corners without a pointer, as the keyboard does', () => {
    expect(collide(null, rect(240, 0, 240, 200))[0]).toBe(middleCell);
  });
});
