import type { ReactNode } from 'react';
import { useSortableItem } from './use-sortable-item';

interface SortableItemProps {
  id: string;
  children: ReactNode;
}

export function SortableItem({ id, children }: SortableItemProps) {
  const { setNodeRef, style, attributes, listeners } = useSortableItem({ id });

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
