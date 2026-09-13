import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MOVE_AND_REORDER_NODE } from '@web/shared/api/outline.api';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { queryClient } from '@web/shared/lib/query-client';
import type { Positions } from '@web/features/outline/components/outline-tree.types';

// headless-tree already shows the new order optimistically; this only persists
// it and refetches.
export function useSidebarDnd() {
  const { mutate: moveNode } = useMutation({
    mutationFn: (variables: {
      nodeId: string;
      targetParentId: string | null;
      nodePositions: Positions[];
    }) => graphqlClient.request(MOVE_AND_REORDER_NODE, variables),
    // The refetch in onSettled snaps a rejected move back into place.
    onError: () =>
      toast.error('Could not move — try again.', { id: 'outline-move-error' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['outline'] }),
  });

  return { moveNode };
}
