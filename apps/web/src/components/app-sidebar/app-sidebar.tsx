import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AddNewButton } from './add-new-button';
import { SortableItem } from './sortable-item';
import { DroppableFolder } from './droppable-folder';
import { DocumentItem } from './document-item';
import {
  DndSidebarContext,
  type ItemsRecord,
  type DataMapEntry,
} from './dnd-sidebar-context';
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
import { useDndMonitor } from '@dnd-kit/core';

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

  // Folder open/close state
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set());
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

  const openFolder = useCallback((folderId: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.add(folderId);
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

  // Build items record: { root: [...], "folder-{id}": [...] }
  const { items, dataMap } = useMemo(() => {
    const rootDocuments = documents.filter((doc) => !doc.folderId);

    // Root items: folders + root docs, sorted by position
    type RootEntry = { key: string; position: number };
    const rootEntries: RootEntry[] = [
      ...folders.map((f) => ({ key: `folder-${f.id}`, position: f.position })),
      ...rootDocuments.map((d) => ({ key: `doc-${d.id}`, position: d.position })),
    ];
    rootEntries.sort((a, b) => a.position - b.position);

    const itemsRecord: ItemsRecord = {
      root: rootEntries.map((e) => e.key),
    };

    // Per-folder containers
    for (const folder of folders) {
      const folderDocs = [...folder.documentsByFolderId.nodes].sort(
        (a, b) => a.position - b.position
      );
      itemsRecord[`folder-${folder.id}`] = folderDocs.map((d) => `doc-${d.id}`);
    }

    // Data map for rendering
    const dm: Record<string, DataMapEntry> = {};
    for (const folder of folders) {
      dm[`folder-${folder.id}`] = { type: 'folder', data: folder };
    }
    for (const doc of documents) {
      dm[`doc-${doc.id}`] = {
        type: 'document',
        data: { id: doc.id, title: doc.title },
      };
    }

    return { items: itemsRecord, dataMap: dm };
  }, [documents, folders]);

  // Build doc data map for DroppableFolder
  const docDataMap = useMemo(() => {
    const map: Record<string, { id: string; title: string }> = {};
    for (const doc of documents) {
      map[`doc-${doc.id}`] = { id: doc.id, title: doc.title };
    }
    return map;
  }, [documents]);

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
                items={items}
                dataMap={dataMap}
                openFolders={openFolders}
                onOpenFolder={openFolder}
                onCollapseFolderForDrag={collapseFolderForDrag}
                onRestoreFolderForDrag={restoreFolderForDrag}
              >
                <SidebarContent_Inner
                  items={items}
                  dataMap={dataMap}
                  docDataMap={docDataMap}
                  openFolders={openFolders}
                  toggleFolder={toggleFolder}
                  folders={folders}
                />
              </DndSidebarContext>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}

/**
 * Inner content rendered inside DndSidebarContext (needs access to DndContext for useDndMonitor).
 * Tracks which folder is being hovered for highlighting.
 */
function SidebarContent_Inner({
  items,
  dataMap,
  docDataMap,
  openFolders,
  toggleFolder,
  folders,
}: {
  items: ItemsRecord;
  dataMap: Record<string, DataMapEntry>;
  docDataMap: Record<string, { id: string; title: string }>;
  openFolders: Set<string>;
  toggleFolder: (id: string) => void;
  folders: FolderNode[];
}) {
  const [overContainerId, setOverContainerId] = useState<string | null>(null);

  useDndMonitor({
    onDragOver(event) {
      const { active, over } = event;
      if (!over || !String(active.id).startsWith('doc-')) {
        setOverContainerId(null);
        return;
      }

      const overIdStr = String(over.id);

      // Check if hovering over a folder's droppable zone
      if (overIdStr.endsWith('-droppable')) {
        setOverContainerId(overIdStr.replace('-droppable', ''));
        return;
      }

      // Check if the over item is inside a folder container, or if
      // we're hovering over a folder's sortable header to drop into it.
      // Highlight when: closed folder header, open+empty folder header, or over a doc inside.
      // Don't highlight open folders that have docs — that's just passing over them while sorting.
      for (const folder of folders) {
        const fKey = `folder-${folder.id}`;
        const isOpen = openFolders.has(folder.id);
        const isEmpty = (items[fKey]?.length ?? 0) === 0;
        if (
          items[fKey]?.includes(overIdStr) ||
          (overIdStr === fKey && (!isOpen || isEmpty))
        ) {
          setOverContainerId(fKey);
          return;
        }
      }

      setOverContainerId(null);
    },
    onDragEnd() {
      setOverContainerId(null);
    },
    onDragCancel() {
      setOverContainerId(null);
    },
  });

  const rootIds = items.root || [];

  return (
    <>
      {rootIds.map((id) => {
        const entry = dataMap[id];
        if (!entry) return null;

        if (entry.type === 'folder') {
          const folder = entry.data as FolderNode;
          const folderId = `folder-${folder.id}`;
          return (
            <DroppableFolder
              key={folderId}
              id={folderId}
              folder={folder}
              docIds={items[folderId] || []}
              docDataMap={docDataMap}
              isOpen={openFolders.has(folder.id)}
              onToggle={() => toggleFolder(folder.id)}
              isOverContainer={overContainerId === folderId}
            />
          );
        }

        const doc = entry.data as { id: string; title: string };
        return (
          <SortableItem key={id} id={id}>
            <DocumentItem doc={doc} />
          </SortableItem>
        );
      })}
    </>
  );
}
