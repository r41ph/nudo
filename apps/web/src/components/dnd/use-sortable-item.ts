import { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface UseSortableItemOptions {
  id: string;
  data?: Record<string, unknown>;
}

export function useSortableItem({ id, data }: UseSortableItemOptions) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : undefined,
    }),
    [transform, transition, isDragging]
  );

  return { attributes, listeners, setNodeRef, style, isDragging };
}
