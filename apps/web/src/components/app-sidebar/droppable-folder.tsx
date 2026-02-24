import { useSortable } from '@dnd-kit/sortable';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@ui/lib/utils';
import { SortableItem } from './sortable-item';
import { FolderItem } from './folder-item';
import { DocumentItem } from './document-item';
import type { FolderNode } from '@web/types/folder.types';

interface DroppableFolderProps {
  id: string;
  folder: FolderNode;
  docIds: string[];
  docDataMap: Record<string, { id: string; title: string }>;
  isOpen: boolean;
  onToggle: () => void;
  isOverContainer: boolean;
}

export function DroppableFolder({
  id,
  folder,
  docIds,
  docDataMap,
  isOpen,
  onToggle,
  isOverContainer,
}: DroppableFolderProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: { type: 'container', children: docIds },
  });

  // Separate droppable for the folder body (when open and empty, or as container)
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `${id}-droppable`,
    data: { type: 'container', children: docIds },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <div ref={setSortableRef} style={style} {...attributes} {...listeners}>
      <div
        className={cn(
          'rounded-md transition-colors',
          isOverContainer && !isDragging && 'bg-sidebar-accent'
        )}
      >
        <FolderItem folder={folder} isOpen={isOpen} onToggle={onToggle} />
        {isOpen && docIds.length > 0 && (
          <div className="pl-6">
            <SortableContext
              items={docIds}
              strategy={verticalListSortingStrategy}
            >
              {docIds.map((docId) => {
                const doc = docDataMap[docId];
                if (!doc) return null;
                return (
                  <SortableItem key={docId} id={docId}>
                    <DocumentItem doc={doc} />
                  </SortableItem>
                );
              })}
            </SortableContext>
          </div>
        )}
        {isOpen && docIds.length === 0 && (
          <div ref={setDroppableRef} className="pl-6 py-6 min-h-16">
            <SortableContext
              items={docIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="text-xs text-muted-foreground">
                Drop documents here
              </div>
            </SortableContext>
          </div>
        )}
        {!isOpen && <div ref={setDroppableRef} />}
      </div>
    </div>
  );
}
