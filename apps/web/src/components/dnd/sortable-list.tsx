import type { ReactNode } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
  type SortingStrategy,
} from '@dnd-kit/sortable';

interface SortableListProps {
  items: string[];
  children: ReactNode;
  strategy?: SortingStrategy;
}

export function SortableList({
  items,
  children,
  strategy = verticalListSortingStrategy,
}: SortableListProps) {
  return (
    <SortableContext items={items} strategy={strategy}>
      {children}
    </SortableContext>
  );
}
