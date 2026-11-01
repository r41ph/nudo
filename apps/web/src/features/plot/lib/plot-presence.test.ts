import { describe, expect, it } from 'vitest';
import {
  NO_PRESENCE,
  nextPresence,
  withPresence,
} from '@web/features/plot/lib/plot-presence';

const ITEMS = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const set = (...ids: string[]) => new Set(ids);

describe('nextPresence', () => {
  it('marks newly hidden ids as leaving', () => {
    expect(nextPresence(NO_PRESENCE, [], ['b'])).toEqual({
      leaving: set('b'),
      entering: set(),
    });
  });

  it('marks newly shown ids as entering', () => {
    expect(nextPresence(NO_PRESENCE, ['a', 'b'], ['a'])).toEqual({
      leaving: set(),
      entering: set('b'),
    });
  });

  it('brings a leaving id back as entering when it is shown again', () => {
    const leaving = nextPresence(NO_PRESENCE, [], ['b']);

    expect(nextPresence(leaving, ['b'], [])).toEqual({
      leaving: set(),
      entering: set('b'),
    });
  });

  it('sends an entering id back out when it is hidden again', () => {
    const entering = nextPresence(NO_PRESENCE, ['b'], []);

    expect(nextPresence(entering, [], ['b'])).toEqual({
      leaving: set('b'),
      entering: set(),
    });
  });

  it('keeps earlier ids moving while new ones start', () => {
    const first = nextPresence(NO_PRESENCE, [], ['a']);

    expect(nextPresence(first, ['a'], ['a', 'c'])).toEqual({
      leaving: set('a', 'c'),
      entering: set(),
    });
  });

  it('returns the same presence when nothing changed', () => {
    const presence = nextPresence(NO_PRESENCE, [], ['a']);

    expect(nextPresence(presence, ['a'], ['a'])).toBe(presence);
  });
});

describe('withPresence', () => {
  it('shows every item when nothing is hidden or moving', () => {
    expect(withPresence(ITEMS, [], NO_PRESENCE)).toEqual([
      { item: ITEMS[0], phase: 'shown' },
      { item: ITEMS[1], phase: 'shown' },
      { item: ITEMS[2], phase: 'shown' },
    ]);
  });

  it('leaves out hidden items that have finished leaving', () => {
    expect(
      withPresence(ITEMS, ['b'], NO_PRESENCE).map(({ item }) => item.id)
    ).toEqual(['a', 'c']);
  });

  it('keeps a leaving item in its place in the full order', () => {
    const presence = { leaving: set('b'), entering: set() };

    expect(withPresence(ITEMS, ['b'], presence)).toEqual([
      { item: ITEMS[0], phase: 'shown' },
      { item: ITEMS[1], phase: 'leaving' },
      { item: ITEMS[2], phase: 'shown' },
    ]);
  });

  it('marks entering items', () => {
    const presence = { leaving: set(), entering: set('c') };

    expect(withPresence(ITEMS, [], presence)[2]).toEqual({
      item: ITEMS[2],
      phase: 'entering',
    });
  });

  // An item deleted mid-animation has nothing left to animate.
  it('drops a leaving id that is no longer in the plot', () => {
    const presence = { leaving: set('gone'), entering: set() };

    expect(withPresence(ITEMS, ['gone'], presence)).toHaveLength(3);
  });
});
