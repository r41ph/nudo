export type PresencePhase = 'shown' | 'entering' | 'leaving';

export interface Presence {
  entering: ReadonlySet<string>;
  leaving: ReadonlySet<string>;
}

export const NO_PRESENCE: Presence = {
  entering: new Set(),
  leaving: new Set(),
};

export const isSettled = (presence: Presence) =>
  presence.entering.size === 0 && presence.leaving.size === 0;

export function nextPresence(
  presence: Presence,
  prevHidden: readonly string[],
  hidden: readonly string[]
): Presence {
  const newlyHidden = hidden.filter((id) => !prevHidden.includes(id));
  const newlyShown = prevHidden.filter((id) => !hidden.includes(id));
  if (newlyHidden.length === 0 && newlyShown.length === 0) return presence;

  const leaving = new Set(presence.leaving);
  const entering = new Set(presence.entering);
  for (const id of newlyHidden) {
    leaving.add(id);
    entering.delete(id);
  }
  for (const id of newlyShown) {
    leaving.delete(id);
    entering.add(id);
  }
  return { leaving, entering };
}

// Leaving items stay in the full order so they fold away where they were.
export function withPresence<T extends { id: string }>(
  items: readonly T[],
  hidden: readonly string[],
  presence: Presence
): { item: T; phase: PresencePhase }[] {
  return items.flatMap((item): { item: T; phase: PresencePhase }[] => {
    if (hidden.includes(item.id))
      return presence.leaving.has(item.id) ? [{ item, phase: 'leaving' }] : [];
    const phase = presence.entering.has(item.id) ? 'entering' : 'shown';
    return [{ item, phase }];
  });
}
