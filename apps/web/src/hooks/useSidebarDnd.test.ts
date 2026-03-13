import { describe, it, expect } from 'vitest';
import { act } from '@testing-library/react';
import { useSidebarDnd } from './useSidebarDnd';
import { renderHookWithProviders } from '@web/test/test-utils';
import { queryClient } from '@web/lib/query-client';

describe('useSidebarDnd', () => {
  it('returns reorderFolders and moveAndReorderDocument functions', () => {
    const { result } = renderHookWithProviders(() => useSidebarDnd());
    expect(typeof result.current.reorderFolders).toBe('function');
    expect(typeof result.current.moveAndReorderDocument).toBe('function');
  });

  it('reorderFolders updates folder positions optimistically', async () => {
    queryClient.setQueryData(['folders'], {
      allFolders: {
        nodes: [
          { id: 'f1', name: 'Folder 1', position: 0, documentsByFolderId: { nodes: [] } },
          { id: 'f2', name: 'Folder 2', position: 1, documentsByFolderId: { nodes: [] } },
        ],
      },
    });

    const { result } = renderHookWithProviders(() => useSidebarDnd());

    await act(async () => {
      result.current.reorderFolders([
        { id: 'f1', position: 1 },
        { id: 'f2', position: 0 },
      ]);
    });

    const foldersCache = queryClient.getQueryData<{
      allFolders: { nodes: Array<{ id: string; position: number }> };
    }>(['folders']);

    const nodes = foldersCache?.allFolders.nodes ?? [];
    expect(nodes[0].id).toBe('f2');
    expect(nodes[0].position).toBe(0);
    expect(nodes[1].id).toBe('f1');
    expect(nodes[1].position).toBe(1);
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

    type DocNode = { id: string; folderId: string | null };
    const docsCache = queryClient.getQueryData<{
      allDocuments: { nodes: Array<DocNode> };
    }>(['documents']);
    const doc = (docsCache?.allDocuments.nodes ?? []).find((d: DocNode) => d.id === 'd1');
    expect(doc?.folderId).toBe('f1');
  });

  it('moveAndReorderDocument updates positions of all docs in the target container', async () => {
    queryClient.setQueryData(['documents'], {
      allDocuments: {
        nodes: [
          { id: 'd1', title: 'Doc 1', updatedAt: '2026-01-01', folderId: null, position: 2 },
          { id: 'd2', title: 'Doc 2', updatedAt: '2026-01-01', folderId: null, position: 0 },
        ],
      },
    });
    queryClient.setQueryData(['folders'], {
      allFolders: { nodes: [] },
    });

    const { result } = renderHookWithProviders(() => useSidebarDnd());

    await act(async () => {
      result.current.moveAndReorderDocument({
        docId: 'd1',
        targetFolderId: null,
        docPositions: [
          { id: 'd1', position: 0 },
          { id: 'd2', position: 1 },
        ],
      });
    });

    type DocNode = { id: string; position: number };
    const docsCache = queryClient.getQueryData<{
      allDocuments: { nodes: Array<DocNode> };
    }>(['documents']);
    const nodes = docsCache?.allDocuments.nodes ?? [];
    const d1 = nodes.find((d: DocNode) => d.id === 'd1');
    const d2 = nodes.find((d: DocNode) => d.id === 'd2');
    expect(d1?.position).toBe(0);
    expect(d2?.position).toBe(1);
  });

  it('moveAndReorderDocument adds the moved doc to the target folder in the folders cache', async () => {
    queryClient.setQueryData(['documents'], {
      allDocuments: {
        nodes: [
          { id: 'd1', title: 'Doc 1', updatedAt: '2026-01-01', folderId: null, position: 0 },
          { id: 'd2', title: 'Doc 2', updatedAt: '2026-01-01', folderId: 'f1', position: 0 },
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
            documentsByFolderId: {
              nodes: [{ id: 'd2', title: 'Doc 2', updatedAt: '2026-01-01', position: 0 }],
            },
          },
        ],
      },
    });

    const { result } = renderHookWithProviders(() => useSidebarDnd());

    await act(async () => {
      result.current.moveAndReorderDocument({
        docId: 'd1',
        targetFolderId: 'f1',
        docPositions: [
          { id: 'd1', position: 0 },
          { id: 'd2', position: 1 },
        ],
      });
    });

    type DocRef = { id: string };
    type FolderNode = { id: string; documentsByFolderId: { nodes: Array<DocRef> } };
    const foldersCache = queryClient.getQueryData<{
      allFolders: { nodes: Array<FolderNode> };
    }>(['folders']);
    const folder = (foldersCache?.allFolders.nodes ?? []).find((f: FolderNode) => f.id === 'f1');
    const docIds = (folder?.documentsByFolderId.nodes ?? []).map((d: DocRef) => d.id);
    expect(docIds).toContain('d1');
    expect(docIds).toContain('d2');
  });
});
