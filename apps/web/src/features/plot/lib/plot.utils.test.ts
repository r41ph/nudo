import { describe, expect, it } from 'vitest';
import {
  applyCardMove,
  cellKey,
  countLabel,
  groupCardsByCell,
  moveId,
  nextPlotlineColor,
  plotCounterLabel,
  visiblePlot,
} from '@web/features/plot/lib/plot.utils';
import { PLOTLINE_COLORS } from '@web/features/plot/constants/plot.constants';
import type {
  Plot,
  PlotCard,
  PlotCell,
  PlotView,
} from '@web/features/plot/plot.types';

describe('nextPlotlineColor', () => {
  it('starts with the first key on an empty board', () => {
    expect(nextPlotlineColor([])).toBe('color1');
  });

  it('takes the first key not yet used, not the next in sequence', () => {
    expect(nextPlotlineColor(['color1', 'color3'])).toBe('color2');
  });

  it('cycles round once all eight are used', () => {
    expect(nextPlotlineColor([...PLOTLINE_COLORS])).toBe('color1');
  });

  it('keeps cycling evenly past the first round', () => {
    expect(nextPlotlineColor([...PLOTLINE_COLORS, 'color1'])).toBe('color2');
  });
});

describe('countLabel', () => {
  it.each([
    [0, '0 cards'],
    [1, '1 card'],
    [2, '2 cards'],
  ])('labels %i as "%s"', (count, label) => {
    expect(countLabel(count, 'card')).toBe(label);
  });
});

describe('moveId', () => {
  it('swaps an id with its neighbour', () => {
    expect(moveId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveId(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
  });

  it('leaves the order alone past either end or for an unknown id', () => {
    expect(moveId(['a', 'b'], 'a', -1)).toEqual(['a', 'b']);
    expect(moveId(['a', 'b'], 'b', 1)).toEqual(['a', 'b']);
    expect(moveId(['a', 'b'], 'z', 1)).toEqual(['a', 'b']);
  });
});

const A1: PlotCell = { plotlineId: 'p1', beatId: 'b1' };
const A2: PlotCell = { plotlineId: 'p1', beatId: 'b2' };
const UNASSIGNED: PlotCell = { plotlineId: null, beatId: null };

function card(id: string, cell: PlotCell, position: number): PlotCard {
  return { id, title: id, description: '', ...cell, position };
}

function idsIn(cards: PlotCard[], cell: PlotCell) {
  return groupCardsByCell(cards)
    .get(cellKey(cell))
    ?.map((c) => c.id);
}

describe('cellKey', () => {
  it('tells cells apart, including the same ids swapped', () => {
    expect(cellKey(A1)).not.toBe(cellKey(A2));
    expect(cellKey({ plotlineId: 'x', beatId: 'y' })).not.toBe(
      cellKey({ plotlineId: 'y', beatId: 'x' })
    );
  });

  it('gives Unassigned its own key', () => {
    expect(cellKey(UNASSIGNED)).not.toBe(cellKey(A1));
  });
});

describe('groupCardsByCell', () => {
  it('groups cards by cell, ordered by position', () => {
    const cards = [
      card('c', A1, 1),
      card('x', A2, 0),
      card('a', A1, 0),
      card('u', UNASSIGNED, 0),
    ];

    const cells = groupCardsByCell(cards);

    expect(cells.get(cellKey(A1))?.map((c) => c.id)).toEqual(['a', 'c']);
    expect(cells.get(cellKey(A2))?.map((c) => c.id)).toEqual(['x']);
    expect(cells.get(cellKey(UNASSIGNED))?.map((c) => c.id)).toEqual(['u']);
  });

  it('has no entry for an empty cell', () => {
    expect(groupCardsByCell([]).get(cellKey(A1))).toBeUndefined();
  });
});

describe('applyCardMove', () => {
  const cards = [
    card('a', A1, 0),
    card('b', A1, 1),
    card('c', A1, 2),
    card('x', A2, 0),
    card('y', A2, 1),
  ];

  it('reorders within a cell', () => {
    const result = applyCardMove(cards, 'c', A1, 0)!;

    expect(result.orderedIds).toEqual(['c', 'a', 'b']);
    expect(idsIn(result.cards, A1)).toEqual(['c', 'a', 'b']);
    expect(result.cards.find((c) => c.id === 'c')?.position).toBe(0);
  });

  it('moves across cells and closes the gap it leaves', () => {
    const result = applyCardMove(cards, 'a', A2, 1)!;

    expect(result.orderedIds).toEqual(['x', 'a', 'y']);
    expect(idsIn(result.cards, A2)).toEqual(['x', 'a', 'y']);
    expect(result.cards.find((c) => c.id === 'a')).toMatchObject(A2);
    expect(
      result.cards
        .filter((c) => c.plotlineId === 'p1' && c.beatId === 'b1')
        .map((c) => [c.id, c.position])
    ).toEqual([
      ['b', 0],
      ['c', 1],
    ]);
  });

  it('moves into an empty cell', () => {
    const empty: PlotCell = { plotlineId: 'p2', beatId: 'b1' };
    const result = applyCardMove(cards, 'b', empty, 0)!;

    expect(result.orderedIds).toEqual(['b']);
    expect(idsIn(result.cards, A1)).toEqual(['a', 'c']);
  });

  it('moves to and from Unassigned', () => {
    const out = applyCardMove(cards, 'x', UNASSIGNED, 0)!;
    expect(out.orderedIds).toEqual(['x']);
    expect(out.cards.find((c) => c.id === 'x')).toMatchObject(UNASSIGNED);

    const back = applyCardMove(out.cards, 'x', A1, 3)!;
    expect(back.orderedIds).toEqual(['a', 'b', 'c', 'x']);
  });

  it('clamps an index past the end to the last slot', () => {
    expect(applyCardMove(cards, 'a', A2, 99)!.orderedIds).toEqual([
      'x',
      'y',
      'a',
    ]);
  });

  it('leaves the input untouched', () => {
    const before = structuredClone(cards);
    applyCardMove(cards, 'a', A2, 0);
    expect(cards).toEqual(before);
  });

  it('returns null for an unknown card', () => {
    expect(applyCardMove(cards, 'zzz', A1, 0)).toBeNull();
  });
});

describe('visiblePlot', () => {
  const plot: Plot = {
    plotlines: [
      { id: 'p1', name: 'Main', color: 'color1', position: 0 },
      { id: 'p2', name: 'Ada', color: 'color2', position: 1 },
      { id: 'p3', name: 'Ben', color: 'color3', position: 2 },
    ],
    beats: [
      { id: 'b1', name: 'Start', position: 0 },
      { id: 'b2', name: 'Middle', position: 1 },
    ],
    cards: [
      card('c1', { plotlineId: 'p1', beatId: 'b1' }, 0),
      card('c2', { plotlineId: 'p2', beatId: 'b1' }, 0),
      card('c3', { plotlineId: 'p3', beatId: 'b2' }, 0),
      card('c4', { plotlineId: 'p1', beatId: 'b2' }, 0),
      card('c5', UNASSIGNED, 0),
    ],
  };
  const view = (
    hiddenPlotlineIds: string[] = [],
    hiddenBeatIds: string[] = []
  ): PlotView => ({ hiddenPlotlineIds, hiddenBeatIds });
  const ids = (items: readonly { id: string }[]) => items.map((i) => i.id);

  it('keeps every plotline, beat and cell card when nothing is hidden', () => {
    const visible = visiblePlot(plot, view());
    expect(ids(visible.plotlines)).toEqual(['p1', 'p2', 'p3']);
    expect(ids(visible.beats)).toEqual(['b1', 'b2']);
    expect(ids(visible.cards)).toEqual(['c1', 'c2', 'c3', 'c4']);
  });

  it('drops hidden plotlines and beats and their cards, keeping order', () => {
    const visible = visiblePlot(plot, view(['p2'], ['b2']));
    expect(ids(visible.plotlines)).toEqual(['p1', 'p3']);
    expect(ids(visible.beats)).toEqual(['b1']);
    expect(ids(visible.cards)).toEqual(['c1']);
  });

  it('ignores ids that are not in the plot', () => {
    const visible = visiblePlot(plot, view(['gone'], ['gone']));
    expect(ids(visible.plotlines)).toEqual(['p1', 'p2', 'p3']);
    expect(ids(visible.beats)).toEqual(['b1', 'b2']);
  });

  it('shows no cards when every plotline is hidden', () => {
    const visible = visiblePlot(plot, view(['p1', 'p2', 'p3']));
    expect(visible.plotlines).toEqual([]);
    expect(visible.beats).toHaveLength(2);
    expect(visible.cards).toEqual([]);
  });
});

describe('plotCounterLabel', () => {
  const plot: Plot = {
    plotlines: [
      { id: 'p1', name: 'Main', color: 'color1', position: 0 },
      { id: 'p2', name: 'Ada', color: 'color2', position: 1 },
    ],
    beats: [{ id: 'b1', name: 'Start', position: 0 }],
    cards: [
      card('c1', { plotlineId: 'p1', beatId: 'b1' }, 0),
      card('c2', { plotlineId: 'p2', beatId: 'b1' }, 0),
    ],
  };

  it('reads as plain totals when nothing is hidden', () => {
    expect(
      plotCounterLabel(plot, { hiddenPlotlineIds: [], hiddenBeatIds: [] })
    ).toBe('2 plotlines · 1 beat · 2 cards');
  });

  it('shows visible of total once something is hidden', () => {
    expect(
      plotCounterLabel(plot, { hiddenPlotlineIds: ['p2'], hiddenBeatIds: [] })
    ).toBe('1 of 2 plotlines · 1 of 1 beat · 1 card');
  });

  it('counts only ids that are in the plot as hidden', () => {
    expect(
      plotCounterLabel(plot, {
        hiddenPlotlineIds: ['gone'],
        hiddenBeatIds: [],
      })
    ).toBe('2 plotlines · 1 beat · 2 cards');
  });
});
