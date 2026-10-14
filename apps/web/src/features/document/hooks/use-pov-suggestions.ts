import { useQuery } from '@tanstack/react-query';
import { POV_SUGGESTION_LIMIT } from '@web/features/document/constants/inspector.constants';
import { outlineQueryOptions } from '@web/shared/api/outline.api';
import { useProjectId } from '@web/shared/hooks/use-project-id';
import type {
  OutlineNode,
  OutlineQueryData,
} from '@web/shared/types/outline.types';

const EMPTY: string[] = [];

// Derived, never stored: a POV is offered only while some document still
// uses it, so there is no list to curate or clean up.
export function povSuggestions(nodes: OutlineNode[], limit: number): string[] {
  const groups = new Map<
    string,
    { uses: number; spellings: Map<string, number> }
  >();

  for (const { pov } of nodes) {
    const label = pov.trim();
    if (!label) continue;
    const key = label.toLocaleLowerCase();
    const group = groups.get(key) ?? { uses: 0, spellings: new Map() };
    group.uses += 1;
    group.spellings.set(label, (group.spellings.get(label) ?? 0) + 1);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map(({ uses, spellings }) => {
      // Map iteration is insertion order, so ties keep the first-seen spelling.
      let label = '';
      let best = 0;
      for (const [spelling, count] of spellings) {
        if (count > best) [label, best] = [spelling, count];
      }
      return { label, uses };
    })
    .sort(
      (a, b) =>
        b.uses - a.uses ||
        a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
    )
    .slice(0, limit)
    .map(({ label }) => label);
}

// Module-level so TanStack Query only reruns it when the outline changes.
const selectSuggestions = (outline: OutlineQueryData) =>
  povSuggestions(outline.allDocuments.nodes, POV_SUGGESTION_LIMIT);

// Same key and request as the outline in the sidebar, so this shares its
// cache instead of fetching, and a save's outline invalidation refreshes it.
export function usePovSuggestions(): string[] {
  const { data } = useQuery({
    ...outlineQueryOptions(useProjectId()),
    select: selectSuggestions,
  });
  return data ?? EMPTY;
}
