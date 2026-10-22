import { describe, expect, it } from 'vitest';
import { nextPlotlineColor } from '@web/features/plot/lib/plot.utils';
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
