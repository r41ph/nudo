import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AddNewButton } from './add-new-button';
import { SortableItem } from './sortable-item';
import { FolderItem } from './folder-item';
import { DocumentItem } from './document-item';
import { DndSidebarContext, type FlatItem } from './dnd-sidebar-context';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
} from '@ui/components/ui/sidebar';
import { GET_DOCUMENTS, GET_FOLDERS } from '@web/graphql/queries';
import { CREATE_DOCUMENT, CREATE_FOLDER } from '@web/graphql/mutations';
import { graphqlClient } from '@web/lib/graphql-client';
import { queryClient } from '@web/lib/query-client';
import type { FolderNode } from '@web/types/folder.types';

type RootItem =
  | { type: 'folder'; data: FolderNode }
  | {
      type: 'document';
      data: {
        id: string;
        title: string;
        updatedAt: string;
        folderId: string | null;
        position: number;
      };
    };

export function AppSidebar() {
  const navigate = useNavigate();

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

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['folders'] });
  };

  const { mutate: createDocument, isPending: isCreatingDoc } = useMutation({
    mutationFn: (variables: {
      title: string;
      content: unknown;
      folderId?: string;
    }) =>
      graphqlClient.request<{
        createNewDocument: { document: { id: string } };
      }>(CREATE_DOCUMENT, variables),
    onSuccess: (data) => {
      invalidateAll();
      navigate(`/document/${data.createNewDocument.document.id}`);
    },
    onError: (e) => {
      console.error('Error creating document:', e);
      invalidateAll();
    },
  });

  const { mutate: createFolder } = useMutation({
    mutationFn: (variables: { name: string }) =>
      graphqlClient.request(CREATE_FOLDER, variables),
    onSuccess: invalidateAll,
  });

  const handleCreateDocument = (folderId?: string) => {
    createDocument({
      title: 'Untitled Document',
      content: [{ type: 'p', children: [{ text: '' }] }],
      ...(folderId ? { folderId } : {}),
    });
  };

  const documents = docsData?.allDocuments?.nodes || [];
  const folders = foldersData?.allFolders?.nodes || [];
  const rootDocuments = documents.filter((doc) => !doc.folderId);

  // Folder open/close state — default all open
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set());

  // Track which folders have been initialized as open
  const [initializedFolderIds, setInitializedFolderIds] = useState<Set<string>>(
    () => new Set()
  );

  // Auto-open new folders as they appear
  useMemo(() => {
    const newIds = folders
      .map((f) => f.id)
      .filter((id) => !initializedFolderIds.has(id));
    if (newIds.length > 0) {
      setOpenFolders((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.add(id));
        return next;
      });
      setInitializedFolderIds((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [folders, initializedFolderIds]);

  const toggleFolder = useCallback((folderId: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const collapseFolderForDrag = useCallback((folderId: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.delete(folderId);
      return next;
    });
  }, []);

  const restoreFolderForDrag = useCallback((folderId: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.add(folderId);
      return next;
    });
  }, []);

  // Merge folders and root docs into a single list sorted by position
  const rootItems: RootItem[] = useMemo(() => {
    const items: RootItem[] = [
      ...folders.map((f) => ({ type: 'folder' as const, data: f })),
      ...rootDocuments.map((d) => ({ type: 'document' as const, data: d })),
    ];
    items.sort((a, b) => a.data.position - b.data.position);
    return items;
  }, [folders, rootDocuments]);

  // Build flat list: for each root item, if it's an open folder, insert its docs after
  const flatItems: FlatItem[] = useMemo(() => {
    const result: FlatItem[] = [];
    for (const item of rootItems) {
      result.push(item);
      if (item.type === 'folder' && openFolders.has(item.data.id)) {
        const folderDocs = [
          ...item.data.documentsByFolderId.nodes,
        ].sort((a, b) => a.position - b.position);
        for (const doc of folderDocs) {
          result.push({
            type: 'document',
            data: {
              id: doc.id,
              title: doc.title,
              folderId: item.data.id,
              position: doc.position,
            },
          });
        }
      }
    }
    return result;
  }, [rootItems, openFolders]);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <AddNewButton
          disabled={isCreatingDoc}
          onNewDocument={() => handleCreateDocument()}
          onNewFolder={() => createFolder({ name: 'Untitled Folder' })}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <DndSidebarContext
                flatItems={flatItems}
                onCollapseFolderForDrag={collapseFolderForDrag}
                onRestoreFolderForDrag={restoreFolderForDrag}
              >
                {flatItems.map((item) => {
                  const key =
                    item.type === 'folder'
                      ? `folder-${item.data.id}`
                      : `doc-${item.data.id}`;
                  return (
                    <SortableItem key={key} id={key}>
                      {item.type === 'folder' ? (
                        <FolderItem
                          folder={item.data}
                          isOpen={openFolders.has(item.data.id)}
                          onToggle={() => toggleFolder(item.data.id)}
                        />
                      ) : (
                        <DocumentItem
                          doc={item.data}
                          indented={!!item.data.folderId}
                        />
                      )}
                    </SortableItem>
                  );
                })}
              </DndSidebarContext>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
