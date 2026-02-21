import { useState, useCallback, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { FileTextIcon, FolderIcon } from 'lucide-react';
import { useSidebarDnd } from '@web/hooks/useSidebarDnd';
import type { FolderNode } from '@web/types/folder.types';

export type FlatItem =
  | { type: 'folder'; data: FolderNode }
  | {
      type: 'document';
      data: {
        id: string;
        title: string;
        folderId: string | null;
        position: number;
      };
    };

interface DndSidebarContextProps {
  children: ReactNode;
  flatItems: FlatItem[];
  onCollapseFolderForDrag: (folderId: string) => void;
  onRestoreFolderForDrag: (folderId: string) => void;
}

interface ActiveItem {
  type: 'folder' | 'document';
  id: string;
  title: string;
}

function itemKey(item: FlatItem): string {
  return item.type === 'folder'
    ? `folder-${item.data.id}`
    : `doc-${item.data.id}`;
}

function parseId(
  sortableId: string
): { type: 'folder' | 'document'; id: string } | null {
  if (sortableId.startsWith('folder-')) {
    return { type: 'folder', id: sortableId.replace('folder-', '') };
  }
  if (sortableId.startsWith('doc-')) {
    return { type: 'document', id: sortableId.replace('doc-', '') };
  }
  return null;
}

export function DndSidebarContext({
  children,
  flatItems,
  onCollapseFolderForDrag,
  onRestoreFolderForDrag,
}: DndSidebarContextProps) {
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const { reorderRootItems, moveAndReorderDocument } = useSidebarDnd();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const sortableIds = flatItems.map(itemKey);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const parsed = parseId(String(event.active.id));
      if (!parsed) return;

      if (parsed.type === 'folder') {
        const item = flatItems.find(
          (fi) => fi.type === 'folder' && fi.data.id === parsed.id
        );
        if (item && item.type === 'folder') {
          setActiveItem({
            type: 'folder',
            id: parsed.id,
            title: item.data.name,
          });
          // Auto-collapse the dragged folder so its docs aren't floating
          setDraggedFolderId(parsed.id);
          onCollapseFolderForDrag(parsed.id);
        }
      } else {
        const item = flatItems.find(
          (fi) => fi.type === 'document' && fi.data.id === parsed.id
        );
        if (item && item.type === 'document') {
          setActiveItem({
            type: 'document',
            id: parsed.id,
            title: item.data.title,
          });
        }
      }
    },
    [flatItems, onCollapseFolderForDrag]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Restore collapsed folder
      if (draggedFolderId) {
        onRestoreFolderForDrag(draggedFolderId);
        setDraggedFolderId(null);
      }
      setActiveItem(null);

      if (!over || active.id === over.id) return;

      const activeIdx = sortableIds.indexOf(String(active.id));
      const overIdx = sortableIds.indexOf(String(over.id));
      if (activeIdx === -1 || overIdx === -1) return;

      const activeParsed = parseId(String(active.id));
      if (!activeParsed) return;

      // Compute the new flat order after the move
      const newOrder = arrayMove(flatItems, activeIdx, overIdx);

      if (activeParsed.type === 'folder') {
        // Folder drag: just reorder root-level items (folders + root docs)
        // Derive new positions for all root-level items
        const rootItems = newOrder.filter(
          (item) => item.type === 'folder' || !item.data.folderId
        );
        reorderRootItems(
          rootItems.map((item, i) => ({
            type: item.type,
            id: item.data.id,
            position: i,
          }))
        );
        return;
      }

      // Document drag: derive folder membership from neighbors
      // A doc joins folder X only if it's placed WITHIN folder X's contiguous
      // block — i.e. both neighbors belong to folder X.
      const draggedDocId = activeParsed.id;
      const dragIdx = newOrder.findIndex(
        (fi) => fi.type === 'document' && fi.data.id === draggedDocId
      );
      if (dragIdx === -1) return;

      const prevItem = dragIdx > 0 ? newOrder[dragIdx - 1] : null;
      const nextItem =
        dragIdx < newOrder.length - 1 ? newOrder[dragIdx + 1] : null;

      // A doc is "inside" folder X when:
      // - prev is folder X header and next is a doc in folder X
      // - prev is a doc in folder X and next is a doc in folder X
      // - prev is a doc in folder X and next is folder X header (shouldn't happen, but safe)
      // Otherwise the doc is at root level.
      let newFolderId: string | null = null;
      if (
        prevItem?.type === 'folder' &&
        nextItem?.type === 'document' &&
        nextItem.data.folderId === prevItem.data.id
      ) {
        // Dropped right after folder header, before one of its docs
        newFolderId = prevItem.data.id;
      } else if (
        prevItem?.type === 'document' &&
        prevItem.data.folderId &&
        nextItem?.type === 'document' &&
        nextItem.data.folderId === prevItem.data.folderId
      ) {
        // Between two docs of the same folder
        newFolderId = prevItem.data.folderId;
      }

      const originalDoc = flatItems.find(
        (fi) => fi.type === 'document' && fi.data.id === draggedDocId
      );
      const originalFolderId =
        originalDoc?.type === 'document' ? originalDoc.data.folderId : null;

      if (newFolderId !== originalFolderId) {
        // Doc changed folder membership
        const docsInTargetFolder = newOrder.filter(
          (fi): fi is FlatItem & { type: 'document' } => {
            if (fi.type !== 'document') return false;
            if (fi.data.id === draggedDocId) return newFolderId !== null;
            return fi.data.folderId === newFolderId;
          }
        );

        const docPositions = docsInTargetFolder.map((fi, i) => ({
          id: fi.data.id,
          position: i,
        }));

        moveAndReorderDocument({
          docId: draggedDocId,
          targetFolderId: newFolderId,
          docPositions,
        });
      } else {
        // Same folder — just reorder
        if (newFolderId) {
          const docsInFolder = newOrder.filter(
            (fi): fi is FlatItem & { type: 'document' } =>
              fi.type === 'document' && fi.data.folderId === newFolderId
          );
          const docPositions = docsInFolder.map((fi, i) => ({
            id: fi.data.id,
            position: i,
          }));

          moveAndReorderDocument({
            docId: draggedDocId,
            targetFolderId: newFolderId,
            docPositions,
          });
        } else {
          // Root doc reorder
          const rootItems = newOrder.filter(
            (fi) => fi.type === 'folder' || !fi.data.folderId
          );
          reorderRootItems(
            rootItems.map((fi, i) => ({
              type: fi.type,
              id: fi.data.id,
              position: i,
            }))
          );
        }
      }
    },
    [
      flatItems,
      sortableIds,
      draggedFolderId,
      reorderRootItems,
      moveAndReorderDocument,
      onRestoreFolderForDrag,
    ]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortableIds}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
      <DragOverlay>
        {activeItem && (
          <div className="flex items-center gap-2 rounded-md bg-sidebar-accent px-2 py-1.5 text-sm opacity-90 shadow-md">
            {activeItem.type === 'folder' ? (
              <FolderIcon className="h-4 w-4" />
            ) : (
              <FileTextIcon className="h-4 w-4" />
            )}
            <span className="truncate">{activeItem.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
