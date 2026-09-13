import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { GET_OUTLINE } from '@web/shared/api/outline.api';
import type { OutlineQueryData } from '@web/shared/types/outline.types';

export interface Crumb {
  id: string;
  title: string;
}

// Shares the `['outline']` query so the breadcrumb can't drift from the rail.
export function useBreadcrumb(docId: string | null): Crumb[] {
  const { data } = useQuery({
    queryKey: ['outline'],
    queryFn: () => graphqlClient.request<OutlineQueryData>(GET_OUTLINE),
    enabled: !!docId,
  });

  if (!docId || !data) return [];

  const byId = new Map(data.allDocuments.nodes.map((n) => [n.id, n]));
  const chain: Crumb[] = [];
  const seen = new Set<string>();

  let current = byId.get(docId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift({ id: current.id, title: current.title });
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return chain;
}
