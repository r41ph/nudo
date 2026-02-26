import { useState, useCallback, useRef, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  closestCenter,
  MeasuringStrategy,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type DragCancelEvent,
  type CollisionDetection,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { FileTextIcon, FolderIcon } from 'lucide-react';
import { useSidebarDnd } from '@web/hooks/useSidebarDnd';
import type { FolderNode } from '@web/types/folder.types';

export type ItemsRecord = Record<string, string[]>;

export interface DataMapEntry {
  type: 'folder' | 'document';
  data: FolderNode | { id: string; title: string };
}

interface DndSidebarContextProps {
  children: ReactNode;
  items: ItemsRecord;
  dataMap: Record<string, DataMapEntry>;
  openFolders: Set<string>;
  onOpenFolder: (folderId: string) => void;
  onCollapseFolderForDrag: (folderId: string) => void;
  onRestoreFolderForDrag: (folderId: string) => void;
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

function findContainer(items: ItemsRecord, id: string): string | undefined {
  // Prefer finding the container that actually contains this item.
  // This ensures container ids (like `folder-123`) that also exist as keys
  // don't incorrectly claim to be their own container when they are listed
  // inside the `root` container.
  const found = Object.keys(items).find((key) => items[key].includes(id));
  if (found) return found;

  // If id is a container key itself (e.g. a droppable zone), return it as a fallback
  if (id in items) return id;

  return undefined;
}

export function DndSidebarContext({
  children,
  items: externalItems,
  dataMap,
  openFolders,
  onOpenFolder,
  onCollapseFolderForDrag,
  onRestoreFolderForDrag,
}: DndSidebarContextProps) {
  const [items, setItems] = useState<ItemsRecord>(externalItems);
  const [clonedItems, setClonedItems] = useState<ItemsRecord | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const lastOverIdRef = useRef<UniqueIdentifier | null>(null);
  const prevExternalItemsRef = useRef<ItemsRecord>(externalItems);
  const { reorderRootItems, moveAndReorderDocument } = useSidebarDnd();

  // Sync only when externalItems reference changes (server data updated),
  // not when local items diverge due to optimistic drag updates
  if (prevExternalItemsRef.current !== externalItems) {
    prevExternalItemsRef.current = externalItems;
    if (!activeId) {
      setItems(externalItems);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Custom collision detection: pointerWithin -> rectIntersection -> drill into container via closestCenter
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      // If dragging a folder, only allow reordering within root
      if (activeId && String(activeId).startsWith('folder-')) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) =>
              items.root?.includes(String(container.id)) ||
              container.id === 'root'
          ),
        });
      }

      // Try pointerWithin first for more accurate detection
      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length > 0) {
        // Check if we hit a container (folder droppable zone)
        const overContainerId = pointerCollisions.find(
          (c) => String(c.id).endsWith('-droppable') || c.id in items
        );

        if (overContainerId) {
          // Resolve the actual container key
          let containerKey: string;
          const colId = String(overContainerId.id);
          if (colId.endsWith('-droppable')) {
            containerKey = colId.replace('-droppable', '');
          } else {
            containerKey = colId;
          }

          // Drill into the container's items via closestCenter
          const containerItems = items[containerKey];
          if (containerItems && containerItems.length > 0) {
            const innerCollisions = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  containerItems.includes(String(container.id)) &&
                  container.id !== activeId
              ),
            });
            if (innerCollisions.length > 0) {
              lastOverIdRef.current = innerCollisions[0].id;
              return innerCollisions;
            }
          }

          // Empty container — return the droppable itself so we can drop into it
          lastOverIdRef.current = overContainerId.id;
          return [overContainerId];
        }

        lastOverIdRef.current = pointerCollisions[0].id;
        return pointerCollisions;
      }

      // Fallback to rectIntersection
      const rectCollisions = rectIntersection(args);
      if (rectCollisions.length > 0) {
        lastOverIdRef.current = rectCollisions[0].id;
        return rectCollisions;
      }

      // If we had a previous over, keep it for stability
      if (lastOverIdRef.current) {
        return [{ id: lastOverIdRef.current }];
      }

      return [];
    },
    [activeId, items]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      setActiveId(id);
      setClonedItems({ ...items });

      const parsed = parseId(id);
      if (parsed?.type === 'folder') {
        setDraggedFolderId(parsed.id);
        onCollapseFolderForDrag(parsed.id);
      }
    },
    [items, onCollapseFolderForDrag]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);

      // Don't move folders between containers — they only reorder in root
      if (activeIdStr.startsWith('folder-')) return;

      // Resolve the over container — could be a droppable zone ID
      let resolvedOverId = overIdStr;
      if (overIdStr.endsWith('-droppable')) {
        resolvedOverId = overIdStr.replace('-droppable', '');
      }

      const activeContainer = findContainer(items, activeIdStr);
      // Prefer treating the resolvedOverId as the container key when it
      // directly matches an items key (e.g. 'folder-123'). This ensures
      // dropping onto a folder's droppable zone targets the folder even
      // when that folder id is also listed inside `items.root`.
      let overContainer =
        resolvedOverId in items
          ? resolvedOverId
          : findContainer(items, resolvedOverId);

      if (
        !activeContainer ||
        !overContainer ||
        activeContainer === overContainer
      ) {
        return;
      }

      // For closed folders, don't move in state during drag (will handle on drop)
      const overParsed = parseId(overContainer);
      if (
        overParsed?.type === 'folder' &&
        overContainer !== 'root' &&
        !openFolders.has(overParsed.id)
      ) {
        return;
      }

      setItems((prev) => {
        const activeItems = [...prev[activeContainer]];
        const overItems = [...prev[overContainer]];

        const activeIndex = activeItems.indexOf(activeIdStr);
        if (activeIndex === -1) return prev;

        // Remove from source
        activeItems.splice(activeIndex, 1);

        // Find insert index in target
        const overIndex = overItems.indexOf(resolvedOverId);
        const newIndex = overIndex >= 0 ? overIndex + 1 : overItems.length;

        overItems.splice(newIndex, 0, activeIdStr);

        return {
          ...prev,
          [activeContainer]: activeItems,
          [overContainer]: overItems,
        };
      });
    },
    [items, openFolders]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Restore collapsed folder
      if (draggedFolderId) {
        onRestoreFolderForDrag(draggedFolderId);
        setDraggedFolderId(null);
      }

      setActiveId(null);
      setClonedItems(null);
      lastOverIdRef.current = null;

      if (!over) return;

      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);

      // Resolve droppable zone IDs
      let resolvedOverId = overIdStr;
      if (overIdStr.endsWith('-droppable')) {
        resolvedOverId = overIdStr.replace('-droppable', '');
      }

      const activeContainer = findContainer(items, activeIdStr);
      // For folder drags, find the container that owns the target item (always 'root').
      // For document drags, treat resolvedOverId as a container when it's a container key
      // (e.g. dropping a doc onto a folder's droppable zone).
      let overContainer: string | undefined;
      if (activeIdStr.startsWith('folder-')) {
        overContainer = findContainer(items, resolvedOverId);
      } else {
        overContainer =
          resolvedOverId in items
            ? resolvedOverId
            : findContainer(items, resolvedOverId);
      }

      if (!activeContainer) return;

      // Handle drop on closed folder — move doc into it and open
      if (activeIdStr.startsWith('doc-')) {
        const overParsed = parseId(resolvedOverId);
        const isClosedFolder =
          overParsed?.type === 'folder' &&
          resolvedOverId in items &&
          !openFolders.has(overParsed.id);

        if (isClosedFolder) {
          const docId = activeIdStr.replace('doc-', '');
          const folderId = overParsed!.id;

          // Build positions: existing docs in folder + this doc at end
          const existingDocs = items[resolvedOverId].filter(
            (id) => id !== activeIdStr
          );
          const docPositions = [
            ...existingDocs.map((id, i) => ({
              id: id.replace('doc-', ''),
              position: i,
            })),
            { id: docId, position: existingDocs.length },
          ];

          moveAndReorderDocument({
            docId,
            targetFolderId: folderId,
            docPositions,
          });
          onOpenFolder(folderId);
          return;
        }
      }

      if (!overContainer) return;

      // Same container — arrayMove
      if (activeContainer === overContainer) {
        const containerItems = items[activeContainer];
        const activeIndex = containerItems.indexOf(activeIdStr);
        const overIndex = containerItems.indexOf(resolvedOverId);

        if (activeIndex !== -1) {
          if (overIndex !== -1 && activeIndex !== overIndex) {
            // Normal reorder within container
            const newOrder = arrayMove(containerItems, activeIndex, overIndex);
            setItems((prev) => ({ ...prev, [activeContainer]: newOrder }));
            persistOrder(activeContainer, newOrder, activeIdStr);
          } else if (overIndex === -1) {
            // Dropped onto the container itself (e.g. open empty folder drop zone)
            // Item was already moved into the container by handleDragOver — just persist
            persistOrder(activeContainer, containerItems, activeIdStr);
          }
        }
        return;
      }

      // Cross-container — item already moved in onDragOver, just persist
      // Final arrayMove within the target container
      const overItems = items[overContainer];
      const activeIndex = overItems.indexOf(activeIdStr);
      const overIndex = overItems.indexOf(resolvedOverId);

      let finalOrder = overItems;
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        finalOrder = arrayMove(overItems, activeIndex, overIndex);
        setItems((prev) => ({
          ...prev,
          [overContainer]: finalOrder,
        }));
      }

      persistOrder(overContainer, finalOrder, activeIdStr);
    },
    [
      items,
      openFolders,
      draggedFolderId,
      moveAndReorderDocument,
      onRestoreFolderForDrag,
      onOpenFolder,
    ]
  );

  const persistOrder = useCallback(
    (container: string, order: string[], activeIdStr: string) => {
      if (container === 'root') {
        // Reorder all root items
        reorderRootItems(
          order.map((id, i) => {
            const parsed = parseId(id);
            return {
              type: parsed?.type ?? 'document',
              id: parsed?.id ?? id,
              position: i,
            };
          })
        );
      } else {
        // Document was moved into/within a folder
        const docId = activeIdStr.replace('doc-', '');
        const folderId = container.replace('folder-', '');
        const docPositions = order.map((id, i) => ({
          id: id.replace('doc-', ''),
          position: i,
        }));

        moveAndReorderDocument({
          docId,
          targetFolderId: folderId,
          docPositions,
        });
      }
    },
    [reorderRootItems, moveAndReorderDocument]
  );

  const handleDragCancel = useCallback(
    (_event: DragCancelEvent) => {
      if (draggedFolderId) {
        onRestoreFolderForDrag(draggedFolderId);
        setDraggedFolderId(null);
      }

      if (clonedItems) {
        setItems(clonedItems);
      }
      setActiveId(null);
      setClonedItems(null);
      lastOverIdRef.current = null;
    },
    [clonedItems, draggedFolderId, onRestoreFolderForDrag]
  );

  // Build overlay content
  const activeEntry = activeId ? dataMap[String(activeId)] : null;
  const activeTitle = activeEntry
    ? activeEntry.type === 'folder'
      ? (activeEntry.data as FolderNode).name
      : (activeEntry.data as { id: string; title: string }).title
    : '';

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      measuring={{
        droppable: { strategy: MeasuringStrategy.Always },
      }}
    >
      <SortableContext
        items={items.root || []}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeId && activeEntry && (
          <div className="flex items-center gap-2 rounded-md bg-sidebar-accent px-2 py-1.5 text-sm opacity-90 shadow-md">
            {activeEntry.type === 'folder' ? (
              <FolderIcon className="h-4 w-4" />
            ) : (
              <FileTextIcon className="h-4 w-4" />
            )}
            <span className="truncate">{activeTitle}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
