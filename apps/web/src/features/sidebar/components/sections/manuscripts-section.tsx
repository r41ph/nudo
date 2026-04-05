import { useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Icon } from '@ui/components/icon/icon';
import { Button } from '@ui/components/ui/button';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@ui/components/ui/sidebar';
import { GET_DOCUMENTS, CREATE_DOCUMENT, RENAME_DOCUMENT, DELETE_DOCUMENT } from '@web/features/document/api/document.api';
import { GET_FOLDERS, RENAME_FOLDER, DELETE_FOLDER } from '@web/features/folder/api/folder.api';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { queryClient } from '@web/shared/lib/query-client';
import { useSidebarDnd } from '@web/features/sidebar/hooks/app-sidebar.hooks';
import {
  FolderTree,
  type FolderTreeHandle,
} from '@web/features/folder/components/folder-tree';
import type {
  TreeLeafItem,
  TreeFolderItem,
  FolderTreeCallbacks,
  FolderTreeConfig,
} from '@web/features/folder/components/folder-tree.types';
import type { FolderNode } from '@web/features/folder/types';

export function ManuscriptsSection() {
  const { id: activeDocId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const folderTreeRef = useRef<FolderTreeHandle>(null);
  const { reorderFolders, moveAndReorderDocument } = useSidebarDnd();

  const { data: docsData } = useQuery({
    queryKey: ['documents'],
    queryFn: () =>
      graphqlClient.request<{
        allDocuments: {
          nodes: Array<{
            id: string;
            title: string;
            updatedAt: string;
            folderId: string | null;
            position: number;
          }>;
        };
      }>(GET_DOCUMENTS),
  });

  const { data: foldersData } = useQuery({
    queryKey: ['folders'],
    queryFn: () =>
      graphqlClient.request<{
        allFolders: { nodes: FolderNode[] };
      }>(GET_FOLDERS),
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['folders'] });
  }, []);

  const { mutate: renameDocument } = useMutation({
    mutationFn: (variables: { id: string; title: string }) =>
      graphqlClient.request(RENAME_DOCUMENT, variables),
    onSuccess: invalidate,
  });

  const { mutate: deleteDocument, mutateAsync: deleteDocumentAsync } =
    useMutation({
      mutationFn: (variables: { id: string }) =>
        graphqlClient.request(DELETE_DOCUMENT, variables),
      onSuccess: invalidate,
    });

  const { mutate: renameFolder } = useMutation({
    mutationFn: (variables: { id: string; name: string }) =>
      graphqlClient.request(RENAME_FOLDER, variables),
    onSuccess: invalidate,
  });

  const { mutate: deleteFolder, mutateAsync: deleteFolderAsync } = useMutation({
    mutationFn: (variables: { id: string }) =>
      graphqlClient.request(DELETE_FOLDER, variables),
    onSuccess: invalidate,
  });

  const { mutate: createDocumentInFolder } = useMutation({
    mutationFn: (variables: {
      title: string;
      content: unknown;
      folderId: string;
    }) =>
      graphqlClient.request<{
        createNewDocument: { document: { id: string } };
      }>(CREATE_DOCUMENT, variables),
    onSuccess: (data, variables) => {
      invalidate();
      folderTreeRef.current?.expandFolder(variables.folderId);
      navigate(`/document/${data.createNewDocument.document.id}`);
    },
  });

  const documents = docsData?.allDocuments?.nodes || [];
  const rawFolders = foldersData?.allFolders?.nodes || [];

  const folders: TreeFolderItem[] = useMemo(
    () =>
      rawFolders.map((f) => ({
        id: f.id,
        name: f.name,
        position: f.position,
        items: [...f.documentsByFolderId.nodes]
          .sort((a, b) => a.position - b.position)
          .map((d) => ({ id: d.id, title: d.title })),
      })),
    [rawFolders]
  );

  const rootItems: TreeLeafItem[] = useMemo(
    () =>
      documents
        .filter((doc) => !doc.folderId)
        .sort((a, b) => a.position - b.position)
        .map((d) => ({ id: d.id, title: d.title, position: d.position })),
    [documents]
  );

  const callbacks: FolderTreeCallbacks = useMemo(
    () => ({
      onRenameFolder: (id, name) => renameFolder({ id, name }),
      onDeleteFolder: async (id) => {
        const folder = rawFolders.find((f) => f.id === id);
        const docIds = folder?.documentsByFolderId.nodes.map((d) => d.id) ?? [];

        let pending = [
          ...docIds.map((docId) => () => deleteDocumentAsync({ id: docId })),
          () => deleteFolderAsync({ id }),
        ];
        // Make sure all documents are deleted even if some deletions fail
        // (promise failures) to avoid leaving orphaned documents
        while (pending.length > 0) {
          const results = await Promise.allSettled(pending.map((fn) => fn()));
          pending = pending.filter((_, i) => results[i].status === 'rejected');
        }
      },
      onRenameItem: (id, title) => renameDocument({ id, title }),
      onDeleteItem: (id) => deleteDocument({ id }),
      onClickItem: (id) => navigate(`/document/${id}`),
      onReorderFolders: (positions) => reorderFolders(positions),
      onMoveDocument: (docId, targetFolderId, docPositions) =>
        moveAndReorderDocument({ docId, targetFolderId, docPositions }),
    }),
    [
      renameFolder,
      deleteFolder,
      deleteFolderAsync,
      renameDocument,
      deleteDocument,
      deleteDocumentAsync,
      rawFolders,
      navigate,
      reorderFolders,
      moveAndReorderDocument,
    ]
  );

  const config: FolderTreeConfig = useMemo(
    () => ({
      itemIcon: () => <Icon name="fileText" />,
      folderActions: (folderId) => (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() =>
            createDocumentInFolder({
              title: 'Untitled Document',
              content: [{ type: 'p', children: [{ text: '' }] }],
              folderId,
            })
          }
          className="h-5 w-5 [&_svg]:size-3.5"
        >
          <Icon name="plus" />
        </Button>
      ),
    }),
    [createDocumentInFolder]
  );

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-1.5 uppercase tracking-widest text-sm">
        <Icon name="bookOpen" className="h-3.5 w-3.5 shrink-0" />
        Story
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <FolderTree
            ref={folderTreeRef}
            folders={folders}
            rootItems={rootItems}
            callbacks={callbacks}
            config={config}
            activeItemId={activeDocId}
          />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
