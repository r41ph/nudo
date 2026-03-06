import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FileTextIcon, PlusIcon } from 'lucide-react';
import { Button } from '@ui/components/ui/button';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@ui/components/ui/sidebar';
import { GET_DOCUMENTS, GET_FOLDERS } from '@web/graphql/queries';
import {
  CREATE_DOCUMENT,
  RENAME_DOCUMENT,
  DELETE_DOCUMENT,
  RENAME_FOLDER,
  DELETE_FOLDER,
} from '@web/graphql/mutations';
import { graphqlClient } from '@web/lib/graphql-client';
import { queryClient } from '@web/lib/query-client';
import { useSidebarDnd } from '@web/hooks/useSidebarDnd';
import {
  FolderTree,
  type TreeLeafItem,
  type TreeFolderItem,
  type FolderTreeCallbacks,
  type FolderTreeConfig,
  type RootOrderItem,
} from '@web/components/folder-tree';
import type { FolderNode } from '@web/types/folder.types';

export function ManuscriptsSection() {
  const { id: activeDocId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { reorderRootItems, moveAndReorderDocument } = useSidebarDnd();

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

  const { mutate: deleteDocument } = useMutation({
    mutationFn: (variables: { id: string }) =>
      graphqlClient.request(DELETE_DOCUMENT, variables),
    onSuccess: invalidate,
  });

  const { mutate: renameFolder } = useMutation({
    mutationFn: (variables: { id: string; name: string }) =>
      graphqlClient.request(RENAME_FOLDER, variables),
    onSuccess: invalidate,
  });

  const { mutate: deleteFolder } = useMutation({
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
    onSuccess: (data) => {
      invalidate();
      navigate(`/document/${data.createNewDocument.document.id}`);
    },
  });

  const documents = docsData?.allDocuments?.nodes || [];
  const rawFolders = foldersData?.allFolders?.nodes || [];

  // Map domain data into generic tree types
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
        .map((d) => ({ id: d.id, title: d.title })),
    [documents]
  );

  const callbacks: FolderTreeCallbacks = useMemo(
    () => ({
      onRenameFolder: (id, name) => renameFolder({ id, name }),
      onDeleteFolder: (id) => deleteFolder({ id }),
      onRenameItem: (id, title) => renameDocument({ id, title }),
      onDeleteItem: (id) => deleteDocument({ id }),
      onClickItem: (item) => navigate(`/document/${item.id}`),
      onReorderRoot: (order: RootOrderItem[]) =>
        reorderRootItems(
          order.map((o) => ({
            type: o.type === 'folder' ? ('folder' as const) : ('document' as const),
            id: o.id,
            position: o.position,
          }))
        ),
      onMoveItem: (itemId, targetFolderId, positions) =>
        moveAndReorderDocument({
          docId: itemId,
          targetFolderId: targetFolderId,
          docPositions: positions,
        }),
    }),
    [
      renameFolder,
      deleteFolder,
      renameDocument,
      deleteDocument,
      navigate,
      reorderRootItems,
      moveAndReorderDocument,
    ]
  );

  const handleCreateInFolder = useCallback(
    (folder: TreeFolderItem) => {
      createDocumentInFolder({
        title: 'Untitled Document',
        content: [{ type: 'p', children: [{ text: '' }] }],
        folderId: folder.id,
      });
    },
    [createDocumentInFolder]
  );

  const config: FolderTreeConfig = useMemo(
    () => ({
      itemIcon: FileTextIcon,
      emptyDropText: 'Drop documents here',
      folderActions: (folder) => (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleCreateInFolder(folder)}
          className="h-5 w-5 [&_svg]:size-3.5"
        >
          <PlusIcon />
        </Button>
      ),
    }),
    [handleCreateInFolder]
  );

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Documents</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <FolderTree
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
