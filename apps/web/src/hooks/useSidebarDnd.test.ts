import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useSidebarDnd, type SidebarItem } from './useSidebarDnd';
import { renderHookWithProviders } from '@web/test/test-utils';
import { queryClient } from '@web/lib/query-client';

describe('useSidebarDnd', () => {
  it('returns reorderRootItems and moveAndReorderDocument functions', () => {
    const { result } = renderHookWithProviders(() => useSidebarDnd());
    expect(typeof result.current.reorderRootItems).toBe('function');
    expect(typeof result.current.moveAndReorderDocument).toBe('function');
  });

  it('reorderRootItems calls the mutation', async () => {
    // Seed the query cache with initial data
    queryClient.setQueryData(['folders'], {
      allFolders: {
        nodes: [
          {
            id: 'f1',
            name: 'Folder 1',
            position: 0,
            documentsByFolderId: { nodes: [] },
          },
        ],
      },
    });
    queryClient.setQueryData(['documents'], {
      allDocuments: {
        nodes: [
          {
            id: 'd1',
            title: 'Doc 1',
            updatedAt: '2026-01-01',
            folderId: null,
            position: 0,
          },
        ],
      },
    });

    const { result } = renderHookWithProviders(() => useSidebarDnd());

    const newOrder: SidebarItem[] = [
      { type: 'document', id: 'd1', position: 0 },
      { type: 'folder', id: 'f1', position: 1 },
    ];

    await act(async () => {
      result.current.reorderRootItems(newOrder);
    });

    // Check optimistic update was applied to folders
    const foldersCache = queryClient.getQueryData<{
      allFolders: { nodes: Array<{ id: string; position: number }> };
    }>(['folders']);
    const folder = foldersCache?.allFolders.nodes.find((f) => f.id === 'f1');
    expect(folder?.position).toBe(1);
  });

  it('moveAndReorderDocument updates document folderId optimistically', async () => {
    queryClient.setQueryData(['documents'], {
      allDocuments: {
        nodes: [
          {
            id: 'd1',
            title: 'Doc 1',
            updatedAt: '2026-01-01',
            folderId: null,
            position: 0,
          },
        ],
      },
    });
    queryClient.setQueryData(['folders'], {
      allFolders: {
        nodes: [
          {
            id: 'f1',
            name: 'Folder 1',
            position: 0,
            documentsByFolderId: { nodes: [] },
          },
        ],
      },
    });

    const { result } = renderHookWithProviders(() => useSidebarDnd());

    await act(async () => {
      result.current.moveAndReorderDocument({
        docId: 'd1',
        targetFolderId: 'f1',
        docPositions: [{ id: 'd1', position: 0 }],
      });
    });

    // Check optimistic update
    const docsCache = queryClient.getQueryData<{
      allDocuments: {
        nodes: Array<{ id: string; folderId: string | null }>;
      };
    }>(['documents']);
    const doc = docsCache?.allDocuments.nodes.find((d) => d.id === 'd1');
    expect(doc?.folderId).toBe('f1');
  });
});
