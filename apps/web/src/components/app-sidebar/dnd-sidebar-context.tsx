import { useState, useCallback, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragOverEvent,
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
  openFolders: Set<string>;
  onCollapseFolderForDrag: (folderId: string) => void;
  onRestoreFolderForDrag: (folderId: string) => void;
  onDropTargetChange: (folderId: string | null) => void;
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
  openFolders,
  onCollapseFolderForDrag,
  onRestoreFolderForDrag,
  onDropTargetChange,
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

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (!activeItem || activeItem.type !== 'document') {
        onDropTargetChange(null);
        return;
      }

      const { over } = event;
      if (!over) {
        onDropTargetChange(null);
        return;
      }

      const overParsed = parseId(String(over.id));
      if (!overParsed) {
        onDropTargetChange(null);
        return;
      }

      // Find the dragged doc's current folder
      const activeFolderId = (() => {
        const doc = flatItems.find(
          (fi) => fi.type === 'document' && fi.data.id === activeItem.id
        );
        return doc?.type === 'document' ? doc.data.folderId : null;
      })();

      if (overParsed.type === 'folder') {
        // Hovering over a folder header — highlight it (unless doc is already in it)
        if (openFolders.has(overParsed.id) && activeFolderId !== overParsed.id) {
          onDropTargetChange(overParsed.id);
        } else {
          onDropTargetChange(null);
        }
      } else {
        // Hovering over a document — highlight its parent folder if it has one
        const overDoc = flatItems.find(
          (fi) => fi.type === 'document' && fi.data.id === overParsed.id
        );
        const overFolderId =
          overDoc?.type === 'document' ? overDoc.data.folderId : null;
        if (overFolderId && activeFolderId !== overFolderId) {
          onDropTargetChange(overFolderId);
        } else {
          onDropTargetChange(null);
        }
      }
    },
    [activeItem, flatItems, openFolders, onDropTargetChange]
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
      onDropTargetChange(null);

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

      // ── Document drag ──
      const draggedDocId = activeParsed.id;
      const overParsed = parseId(String(over.id));

      // Zone-based detection: when the over target is an open folder,
      // check pointer Y to decide "into folder" (center) vs "reorder" (edges).
      if (overParsed?.type === 'folder' && openFolders.has(overParsed.id)) {
        const pointerY =
          (event.activatorEvent as PointerEvent).clientY + event.delta.y;
        const overRect = over.rect;
        const topThreshold = overRect.top + overRect.height * 0.25;
        const bottomThreshold = overRect.top + overRect.height * 0.75;

        if (pointerY >= topThreshold && pointerY <= bottomThreshold) {
          // Center zone → move doc INTO this folder (append at end)
          const folder = flatItems.find(
            (fi) => fi.type === 'folder' && fi.data.id === overParsed.id
          );
          if (folder && folder.type === 'folder') {
            const existingDocs = folder.data.documentsByFolderId.nodes.filter(
              (d) => d.id !== draggedDocId
            );
            const docPositions = [
              ...existingDocs.map((d, i) => ({ id: d.id, position: i })),
              { id: draggedDocId, position: existingDocs.length },
            ];
            moveAndReorderDocument({
              docId: draggedDocId,
              targetFolderId: overParsed.id,
              docPositions,
            });
            return;
          }
        }
        // Edge zones fall through to normal reorder logic below
      }

      // Normal reorder: arrayMove + strict two-neighbor rule
      const dragIdx = newOrder.findIndex(
        (fi) => fi.type === 'document' && fi.data.id === draggedDocId
      );
      if (dragIdx === -1) return;

      const prevItem = dragIdx > 0 ? newOrder[dragIdx - 1] : null;
      const nextItem =
        dragIdx < newOrder.length - 1 ? newOrder[dragIdx + 1] : null;

      // A doc joins folder X only if BOTH neighbors belong to folder X.
      let newFolderId: string | null = null;
      if (
        prevItem?.type === 'folder' &&
        nextItem?.type === 'document' &&
        nextItem.data.folderId === prevItem.data.id
      ) {
        newFolderId = prevItem.data.id;
      } else if (
        prevItem?.type === 'document' &&
        prevItem.data.folderId &&
        nextItem?.type === 'document' &&
        nextItem.data.folderId === prevItem.data.folderId
      ) {
        newFolderId = prevItem.data.folderId;
      }

      const originalDoc = flatItems.find(
        (fi) => fi.type === 'document' && fi.data.id === draggedDocId
      );
      const originalFolderId =
        originalDoc?.type === 'document' ? originalDoc.data.folderId : null;

      if (newFolderId !== originalFolderId) {
        const docsInTargetFolder = newOrder.filter(
          (fi): fi is FlatItem & { type: 'document' } => {
            if (fi.type !== 'document') return false;
            if (fi.data.id === draggedDocId) return newFolderId !== null;
            return fi.data.folderId === newFolderId;
          }
        );
        moveAndReorderDocument({
          docId: draggedDocId,
          targetFolderId: newFolderId,
          docPositions: docsInTargetFolder.map((fi, i) => ({
            id: fi.data.id,
            position: i,
          })),
        });
      } else if (newFolderId) {
        const docsInFolder = newOrder.filter(
          (fi): fi is FlatItem & { type: 'document' } =>
            fi.type === 'document' && fi.data.folderId === newFolderId
        );
        moveAndReorderDocument({
          docId: draggedDocId,
          targetFolderId: newFolderId,
          docPositions: docsInFolder.map((fi, i) => ({
            id: fi.data.id,
            position: i,
          })),
        });
      } else {
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
    },
    [
      flatItems,
      sortableIds,
      openFolders,
      draggedFolderId,
      reorderRootItems,
      moveAndReorderDocument,
      onRestoreFolderForDrag,
      onDropTargetChange,
    ]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
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
