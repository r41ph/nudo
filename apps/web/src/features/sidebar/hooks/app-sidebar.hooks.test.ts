import { describe, it, expect } from 'vitest';
import { graphql, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '@web/test/mocks/server';
import { useSidebarDnd } from '@web/features/sidebar/hooks/app-sidebar.hooks';
import { renderHookWithProviders } from '@web/test/test-utils';

describe('useSidebarDnd', () => {
  it('exposes a moveNode function', () => {
    const { result } = renderHookWithProviders(() => useSidebarDnd());
    expect(typeof result.current.moveNode).toBe('function');
  });

  it('moveNode issues MoveAndReorderNode with the given variables', async () => {
    let captured: Record<string, unknown> | null = null;
    server.use(
      graphql.mutation('MoveAndReorderNode', ({ variables }) => {
        captured = variables;
        return HttpResponse.json({
          data: { moveAndReorderNode: { clientMutationId: null } },
        });
      })
    );

    const { result } = renderHookWithProviders(() => useSidebarDnd());
    result.current.moveNode({
      nodeId: 'n1',
      targetParentId: 'p1',
      nodePositions: [{ id: 'n1', position: 0 }],
    });

    await waitFor(() => expect(captured).not.toBeNull());
    expect(captured).toEqual({
      nodeId: 'n1',
      targetParentId: 'p1',
      nodePositions: [{ id: 'n1', position: 0 }],
    });
  });
});
