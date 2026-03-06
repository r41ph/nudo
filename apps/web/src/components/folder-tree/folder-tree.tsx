import { useState, useCallback, useRef, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDndMonitor,
  pointerWithin,
  rectIntersection,
  closestCenter,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type CollisionDetection,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { FileTextIcon, FolderIcon } from 'lucide-react';
import { SortableItem } from '@web/components/dnd/sortable-item';
import { SortableList } from '@web/components/dnd/sortable-list';
import { parseId, findContainer } from './folder-tree.utils';
import { DND_MEASURING_CONFIG } from './folder-tree.constants';
import { DroppableFolder } from './droppable-folder';
import { TreeItem } from './tree-item';
import type {
  TreeFolderItem,
  TreeLeafItem,
  ItemsRecord,
  DataMapEntry,
  FolderTreeCallbacks,
  FolderTreeConfig,
} from './folder-tree.types';

interface FolderTreeProps {
  folders: TreeFolderItem[];
  rootItems: TreeLeafItem[];
  callbacks: FolderTreeCallbacks;
  config?: FolderTreeConfig;
  activeItemId?: string;
}

export function FolderTree({
  folders,
  rootItems,
  callbacks,
  config,
  activeItemId,
}: FolderTreeProps) {
  // Build items record and data maps from props
  const { externalItems, dataMap, itemDataMap } = useMemo(() => {
    type RootEntry = { key: string; position: number };
    const rootEntries: RootEntry[] = [
      ...folders.map((f) => ({ key: `folder-${f.id}`, position: f.position })),
      ...rootItems.map((d, i) => ({ key: `item-${d.id}`, position: i })),
    ];
    rootEntries.sort((a, b) => a.position - b.position);

    const itemsRecord: ItemsRecord = {
      root: rootEntries.map((e) => e.key),
    };

    for (const folder of folders) {
      const sortedItems = [...folder.items].sort(
        (a, b) => (a as TreeLeafItem & { position?: number }).position ?? 0 -
                   ((b as TreeLeafItem & { position?: number }).position ?? 0)
      );
      itemsRecord[`folder-${folder.id}`] = sortedItems.map(
        (d) => `item-${d.id}`
      );
    }

    const dm: Record<string, DataMapEntry> = {};
    for (const folder of folders) {
      dm[`folder-${folder.id}`] = { type: 'folder', data: folder };
    }

    const idm: Record<string, TreeLeafItem> = {};
    for (const item of rootItems) {
      dm[`item-${item.id}`] = { type: 'item', data: item };
      idm[`item-${item.id}`] = item;
    }
    for (const folder of folders) {
      for (const item of folder.items) {
        dm[`item-${item.id}`] = { type: 'item', data: item };
        idm[`item-${item.id}`] = item;
      }
    }

    return { externalItems: itemsRecord, dataMap: dm, itemDataMap: idm };
  }, [folders, rootItems]);

  // DnD state
  const [items, setItems] = useState<ItemsRecord>(externalItems);
  const [clonedItems, setClonedItems] = useState<ItemsRecord | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const lastOverIdRef = useRef<UniqueIdentifier | null>(null);
  const prevExternalItemsRef = useRef<ItemsRecord>(externalItems);

  // Folder open/close state
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set());

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
      if (prev.has(folderId)) return prev;
      const next = new Set(prev);
      next.add(folderId);
      return next;
    });
  }, []);

  const collapseFolderForDrag = useCallback((folderId: string) => {
    setOpenFolders((prev) => {
      if (!prev.has(folderId)) return prev;
      const next = new Set(prev);
      next.delete(folderId);
      return next;
    });
  }, []);

  const restoreFolderForDrag = useCallback((folderId: string) => {
    setOpenFolders((prev) => {
      if (prev.has(folderId)) return prev;
      const next = new Set(prev);
      next.add(folderId);
      return next;
    });
  }, []);

  // Sync external items when data changes (but not during active drag)
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

  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
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

      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length > 0) {
        const overContainerId = pointerCollisions.find(
          (c) => String(c.id).endsWith('-droppable') || c.id in items
        );

        if (overContainerId) {
          let containerKey: string;
          const colId = String(overContainerId.id);
          if (colId.endsWith('-droppable')) {
            containerKey = colId.replace('-droppable', '');
          } else {
            containerKey = colId;
          }

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

          lastOverIdRef.current = overContainerId.id;
          return [overContainerId];
        }

        lastOverIdRef.current = pointerCollisions[0].id;
        return pointerCollisions;
      }

      const rectCollisions = rectIntersection(args);
      if (rectCollisions.length > 0) {
        lastOverIdRef.current = rectCollisions[0].id;
        return rectCollisions;
      }

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
        collapseFolderForDrag(parsed.id);
      }
    },
    [items, collapseFolderForDrag]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);

      if (activeIdStr.startsWith('folder-')) return;

      let resolvedOverId = overIdStr;
      if (overIdStr.endsWith('-droppable')) {
        resolvedOverId = overIdStr.replace('-droppable', '');
      }

      const activeContainer = findContainer(items, activeIdStr);
      const overContainer =
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

        activeItems.splice(activeIndex, 1);

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

  const persistOrder = useCallback(
    (container: string, order: string[], activeIdStr: string) => {
      if (container === 'root') {
        callbacks.onReorderRoot(
          order.map((id, i) => {
            const parsed = parseId(id);
            return {
              type: parsed?.type ?? 'item',
              id: parsed?.id ?? id,
              position: i,
            };
          })
        );
      } else {
        const itemId = activeIdStr.replace('item-', '');
        const folderId = container.replace('folder-', '');
        const positions = order.map((id, i) => ({
          id: id.replace('item-', ''),
          position: i,
        }));

        callbacks.onMoveItem(itemId, folderId, positions);
      }
    },
    [callbacks]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (draggedFolderId) {
        restoreFolderForDrag(draggedFolderId);
        setDraggedFolderId(null);
      }

      setActiveId(null);
      setClonedItems(null);
      lastOverIdRef.current = null;

      if (!over) return;

      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);

      let resolvedOverId = overIdStr;
      if (overIdStr.endsWith('-droppable')) {
        resolvedOverId = overIdStr.replace('-droppable', '');
      }

      const activeContainer = findContainer(items, activeIdStr);
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

      // Handle drop on closed folder
      if (activeIdStr.startsWith('item-')) {
        const overParsed = parseId(resolvedOverId);
        const isClosedFolder =
          overParsed?.type === 'folder' &&
          resolvedOverId in items &&
          !openFolders.has(overParsed.id);

        if (isClosedFolder) {
          const itemId = activeIdStr.replace('item-', '');
          const folderId = overParsed!.id;

          const existingItems = items[resolvedOverId].filter(
            (id) => id !== activeIdStr
          );
          const positions = [
            ...existingItems.map((id, i) => ({
              id: id.replace('item-', ''),
              position: i,
            })),
            { id: itemId, position: existingItems.length },
          ];

          callbacks.onMoveItem(itemId, folderId, positions);
          openFolder(folderId);
          return;
        }
      }

      if (!overContainer) return;

      if (activeContainer === overContainer) {
        const containerItems = items[activeContainer];
        const activeIndex = containerItems.indexOf(activeIdStr);
        const overIndex = containerItems.indexOf(resolvedOverId);

        if (activeIndex !== -1) {
          if (overIndex !== -1 && activeIndex !== overIndex) {
            const newOrder = arrayMove(containerItems, activeIndex, overIndex);
            setItems((prev) => ({ ...prev, [activeContainer]: newOrder }));
            persistOrder(activeContainer, newOrder, activeIdStr);
          } else if (overIndex === -1) {
            persistOrder(activeContainer, containerItems, activeIdStr);
          }
        }
        return;
      }

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
      callbacks,
      persistOrder,
      restoreFolderForDrag,
      openFolder,
    ]
  );

  const handleDragCancel = useCallback(
    () => {
      if (draggedFolderId) {
        restoreFolderForDrag(draggedFolderId);
        setDraggedFolderId(null);
      }

      if (clonedItems) {
        setItems(clonedItems);
      }
      setActiveId(null);
      setClonedItems(null);
      lastOverIdRef.current = null;
    },
    [clonedItems, draggedFolderId, restoreFolderForDrag]
  );

  // Build overlay content
  const activeEntry = activeId ? dataMap[String(activeId)] : null;
  const activeTitle = activeEntry
    ? activeEntry.type === 'folder'
      ? (activeEntry.data as TreeFolderItem).name
      : (activeEntry.data as TreeLeafItem).title
    : '';

  const ItemIcon = config?.itemIcon ?? FileTextIcon;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      measuring={DND_MEASURING_CONFIG}
    >
      <SortableList items={items.root || []}>
        <FolderTreeContent
          items={items}
          dataMap={dataMap}
          itemDataMap={itemDataMap}
          openFolders={openFolders}
          toggleFolder={toggleFolder}
          folders={folders}
          activeItemId={activeItemId}
          callbacks={callbacks}
          config={config}
        />
      </SortableList>
      <DragOverlay dropAnimation={null}>
        {activeId && activeEntry && (
          <div className="flex items-center gap-2 rounded-md bg-sidebar-accent px-2 py-1.5 text-sm opacity-90 shadow-md">
            {activeEntry.type === 'folder' ? (
              <FolderIcon className="h-4 w-4" />
            ) : (
              <ItemIcon className="h-4 w-4" />
            )}
            <span className="truncate">{activeTitle}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// Inner content that uses useDndMonitor (must be inside DndContext)
interface FolderTreeContentProps {
  items: ItemsRecord;
  dataMap: Record<string, DataMapEntry>;
  itemDataMap: Record<string, TreeLeafItem>;
  openFolders: Set<string>;
  toggleFolder: (id: string) => void;
  folders: TreeFolderItem[];
  activeItemId?: string;
  callbacks: FolderTreeCallbacks;
  config?: FolderTreeConfig;
}

function FolderTreeContent({
  items,
  dataMap,
  itemDataMap,
  openFolders,
  toggleFolder,
  folders,
  activeItemId,
  callbacks,
  config,
}: FolderTreeContentProps) {
  const [overContainerId, setOverContainerId] = useState<string | null>(null);

  useDndMonitor({
    onDragOver(event) {
      const { active, over } = event;
      if (!over || !String(active.id).startsWith('item-')) {
        setOverContainerId(null);
        return;
      }

      const overIdStr = String(over.id);

      if (overIdStr.endsWith('-droppable')) {
        setOverContainerId(overIdStr.replace('-droppable', ''));
        return;
      }

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
          const folder = entry.data as TreeFolderItem;
          const folderId = `folder-${folder.id}`;
          return (
            <DroppableFolder
              key={folderId}
              id={folderId}
              folder={folder}
              itemIds={items[folderId] || []}
              itemDataMap={itemDataMap}
              isOpen={openFolders.has(folder.id)}
              onToggle={toggleFolder}
              isOverContainer={overContainerId === folderId}
              activeItemId={activeItemId}
              callbacks={callbacks}
              config={config}
            />
          );
        }

        const item = entry.data as TreeLeafItem;
        return (
          <SortableItem key={id} id={id}>
            <TreeItem
              item={item}
              isActive={activeItemId === item.id}
              onRename={callbacks.onRenameItem}
              onDelete={callbacks.onDeleteItem}
              onClick={callbacks.onClickItem}
              config={config}
            />
          </SortableItem>
        );
      })}
    </>
  );
}
