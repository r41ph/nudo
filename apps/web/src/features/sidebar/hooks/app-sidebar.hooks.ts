import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MOVE_AND_REORDER_NODE } from '@web/shared/api/outline.api';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { queryClient } from '@web/shared/lib/query-client';
import type { Positions } from '@web/features/outline/components/outline-tree.types';

// The headless-tree store already reflects the new order optimistically during
// the drag, so this mutation only persists + refetches the authoritative order.
export function useSidebarDnd() {
  const { mutate: moveNode } = useMutation({
    mutationFn: (variables: {
      nodeId: string;
      targetParentId: string | null;
      nodePositions: Positions[];
    }) => graphqlClient.request(MOVE_AND_REORDER_NODE, variables),
    // A rejected move (e.g. cycle guard) is surfaced; onSettled then refetches
    // the authoritative order, snapping the optimistic UI back into place.
    onError: () =>
      toast.error('Could not move — try again.', { id: 'outline-move-error' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['outline'] }),
  });

  return { moveNode };
}
