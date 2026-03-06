import { memo, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@ui/lib/utils';
import { SortableItem } from '@web/components/dnd/sortable-item';
import { SortableList } from '@web/components/dnd/sortable-list';
import { useSortableItem } from '@web/components/dnd/use-sortable-item';
import { FolderItem } from './folder-item';
import { TreeItem } from './tree-item';
import type {
  TreeFolderItem,
  TreeLeafItem,
  FolderTreeCallbacks,
  FolderTreeConfig,
} from './folder-tree.types';

interface DroppableFolderProps {
  id: string;
  folder: TreeFolderItem;
  itemIds: string[];
  itemDataMap: Record<string, TreeLeafItem>;
  isOpen: boolean;
  onToggle: (folderId: string) => void;
  isOverContainer: boolean;
  activeItemId: string | undefined;
  callbacks: FolderTreeCallbacks;
  config?: FolderTreeConfig;
}

export const DroppableFolder = memo(function DroppableFolder({
  id,
  folder,
  itemIds,
  itemDataMap,
  isOpen,
  onToggle,
  isOverContainer,
  activeItemId,
  callbacks,
  config,
}: DroppableFolderProps) {
  const sortableData = useMemo(
    () => ({ type: 'container' as const, children: itemIds }),
    [itemIds]
  );

  const {
    setNodeRef: setSortableRef,
    style,
    attributes,
    listeners,
    isDragging,
  } = useSortableItem({
    id,
    data: sortableData,
  });

  const droppableData = useMemo(
    () => ({ type: 'container' as const, children: itemIds }),
    [itemIds]
  );

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `${id}-droppable`,
    data: droppableData,
  });

  const emptyDropText = config?.emptyDropText ?? 'Drop items here';

  return (
    <div ref={setSortableRef} style={style} {...attributes} {...listeners}>
      <div
        className={cn(
          'rounded-md transition-colors',
          isOverContainer && !isDragging && 'bg-sidebar-accent'
        )}
      >
        <FolderItem
          folder={folder}
          isOpen={isOpen}
          onToggle={onToggle}
          onRename={callbacks.onRenameFolder}
          onDelete={callbacks.onDeleteFolder}
          config={config}
        />
        {isOpen && itemIds.length > 0 && (
          <div className="pl-6">
            <SortableList items={itemIds}>
              {itemIds.map((itemId) => {
                const item = itemDataMap[itemId];
                if (!item) return null;
                return (
                  <SortableItem key={itemId} id={itemId}>
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
            </SortableList>
          </div>
        )}
        {isOpen && itemIds.length === 0 && (
          <div ref={setDroppableRef} className="pl-6 py-6 min-h-16">
            <SortableList items={itemIds}>
              <div className="text-xs text-muted-foreground">
                {emptyDropText}
              </div>
            </SortableList>
          </div>
        )}
        {!isOpen && <div ref={setDroppableRef} />}
      </div>
    </div>
  );
});
