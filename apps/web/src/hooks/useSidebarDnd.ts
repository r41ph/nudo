import { useMutation } from '@tanstack/react-query';
import {
  REORDER_FOLDERS,
  MOVE_AND_REORDER_DOCUMENT,
} from '@web/graphql/mutations';
import { graphqlClient } from '@web/lib/graphql-client';
import { queryClient } from '@web/lib/query-client';
import type { FolderNode } from '@web/types/folder.types';

interface DocumentsQueryData {
  allDocuments: {
    nodes: Array<{
      id: string;
      title: string;
      updatedAt: string;
      folderId: string | null;
      position: number;
    }>;
  };
}

interface FoldersQueryData {
  allFolders: { nodes: FolderNode[] };
}

const invalidateAll = () => {
  queryClient.invalidateQueries({ queryKey: ['documents'] });
  queryClient.invalidateQueries({ queryKey: ['folders'] });
};

export interface SidebarItem {
  type: 'folder' | 'document';
  id: string;
  position: number;
}

export function useSidebarDnd() {
  // Reorder the flat root list (folders + root docs interleaved).
  // Calls both reorderFolders and moveAndReorderDocument to persist.
  const { mutate: reorderRootItems } = useMutation({
    mutationFn: async (newOrder: SidebarItem[]) => {
      const folderPositions = newOrder
        .filter((item) => item.type === 'folder')
        .map((item) => ({ id: item.id, position: item.position }));

      const docPositions = newOrder
        .filter((item) => item.type === 'document')
        .map((item) => ({ id: item.id, position: item.position }));

      const promises: Promise<unknown>[] = [];

      if (folderPositions.length > 0) {
        promises.push(
          graphqlClient.request(REORDER_FOLDERS, { folderPositions })
        );
      }

      if (docPositions.length > 0) {
        // Use the first doc as the doc_id; target stays null (root)
        promises.push(
          graphqlClient.request(MOVE_AND_REORDER_DOCUMENT, {
            docId: docPositions[0].id,
            targetFolderId: null,
            docPositions,
          })
        );
      }

      await Promise.all(promises);
    },
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: ['folders'] });
      await queryClient.cancelQueries({ queryKey: ['documents'] });

      const prevFolders =
        queryClient.getQueryData<FoldersQueryData>(['folders']);
      const prevDocs =
        queryClient.getQueryData<DocumentsQueryData>(['documents']);

      if (prevFolders) {
        const posMap = new Map(
          newOrder
            .filter((i) => i.type === 'folder')
            .map((i) => [i.id, i.position])
        );
        queryClient.setQueryData<FoldersQueryData>(['folders'], {
          allFolders: {
            nodes: [...prevFolders.allFolders.nodes]
              .map((f) => ({
                ...f,
                position: posMap.get(f.id) ?? f.position,
              }))
              .sort((a, b) => a.position - b.position),
          },
        });
      }

      if (prevDocs) {
        const posMap = new Map(
          newOrder
            .filter((i) => i.type === 'document')
            .map((i) => [i.id, i.position])
        );
        queryClient.setQueryData<DocumentsQueryData>(['documents'], {
          allDocuments: {
            nodes: prevDocs.allDocuments.nodes
              .map((d) => ({
                ...d,
                position: posMap.get(d.id) ?? d.position,
              }))
              .sort((a, b) => a.position - b.position),
          },
        });
      }

      return { prevFolders, prevDocs };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevFolders) {
        queryClient.setQueryData(['folders'], context.prevFolders);
      }
      if (context?.prevDocs) {
        queryClient.setQueryData(['documents'], context.prevDocs);
      }
    },
    onSettled: invalidateAll,
  });

  const { mutate: moveAndReorderDocument } = useMutation({
    mutationFn: (variables: {
      docId: string;
      targetFolderId: string | null;
      docPositions: Array<{ id: string; position: number }>;
    }) =>
      graphqlClient.request(MOVE_AND_REORDER_DOCUMENT, {
        docId: variables.docId,
        targetFolderId: variables.targetFolderId,
        docPositions: variables.docPositions,
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['documents'] });
      await queryClient.cancelQueries({ queryKey: ['folders'] });

      const prevDocs =
        queryClient.getQueryData<DocumentsQueryData>(['documents']);
      const prevFolders =
        queryClient.getQueryData<FoldersQueryData>(['folders']);

      if (prevDocs) {
        const posMap = new Map(
          variables.docPositions.map((d) => [d.id, d.position])
        );
        queryClient.setQueryData<DocumentsQueryData>(['documents'], {
          allDocuments: {
            nodes: prevDocs.allDocuments.nodes
              .map((d) => ({
                ...d,
                folderId:
                  d.id === variables.docId
                    ? variables.targetFolderId
                    : d.folderId,
                position: posMap.get(d.id) ?? d.position,
              }))
              .sort((a, b) => a.position - b.position),
          },
        });
      }

      if (prevFolders) {
        const posMap = new Map(
          variables.docPositions.map((d) => [d.id, d.position])
        );
        const movedDoc = prevDocs?.allDocuments.nodes.find(
          (d) => d.id === variables.docId
        );

        queryClient.setQueryData<FoldersQueryData>(['folders'], {
          allFolders: {
            nodes: prevFolders.allFolders.nodes.map((folder) => {
              const updatedDocs = folder.documentsByFolderId.nodes
                .filter((d) => d.id !== variables.docId)
                .map((d) => ({
                  ...d,
                  position: posMap.get(d.id) ?? d.position,
                }));

              if (folder.id === variables.targetFolderId && movedDoc) {
                updatedDocs.push({
                  id: movedDoc.id,
                  title: movedDoc.title,
                  updatedAt: movedDoc.updatedAt,
                  position: posMap.get(movedDoc.id) ?? 0,
                });
              }

              return {
                ...folder,
                documentsByFolderId: {
                  nodes: updatedDocs.sort((a, b) => a.position - b.position),
                },
              };
            }),
          },
        });
      }

      return { prevDocs, prevFolders };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevDocs) {
        queryClient.setQueryData(['documents'], context.prevDocs);
      }
      if (context?.prevFolders) {
        queryClient.setQueryData(['folders'], context.prevFolders);
      }
    },
    onSettled: invalidateAll,
  });

  return { reorderRootItems, moveAndReorderDocument };
}
