import { describe, expect, it } from 'vitest';
import {
  countLabel,
  moveId,
  nextPlotlineColor,
} from '@web/features/plot/lib/plot.utils';
import { PLOTLINE_COLORS } from '@web/features/plot/constants/plot.constants';

describe('nextPlotlineColor', () => {
  it('starts with the first key on an empty board', () => {
    expect(nextPlotlineColor([])).toBe('blue');
  });

  it('takes the first key not yet used, not the next in sequence', () => {
    expect(nextPlotlineColor(['blue', 'plum'])).toBe('green');
  });

  it('cycles round once all seven are used', () => {
    expect(nextPlotlineColor([...PLOTLINE_COLORS])).toBe('blue');
  });

  it('keeps cycling evenly past the first round', () => {
    expect(nextPlotlineColor([...PLOTLINE_COLORS, 'blue'])).toBe('green');
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
