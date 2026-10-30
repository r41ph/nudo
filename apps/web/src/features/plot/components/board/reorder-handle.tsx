import type { ComponentProps } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { Icon } from '@ui/components/icon/icon';
import { Button } from '@ui/components/ui/button';
import { cn } from '@ui/lib/utils';
import {
  acceptsDrop,
  type PlotDragType,
} from '@web/features/plot/lib/plot-dnd';

interface ReorderSortableArgs {
  id: string;
  type: 'plotline' | 'beat';
  editable: boolean;
  dragType: PlotDragType | null;
  // While renaming, a pointer drag would fight text selection.
  paused: boolean;
}

// The whole label or header is the pointer target; the handle is the
// keyboard one, since a plain div is not focusable.
export function useReorderSortable({
  id,
  type,
  editable,
  dragType,
  paused,
}: ReorderSortableArgs) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useSortable({
      id,
      data: { type },
      disabled: {
        draggable: !editable || paused,
        droppable: !editable || !acceptsDrop(dragType, type),
      },
    });

  return {
    isDragging,
    containerProps: editable ? { ref: setNodeRef, ...listeners } : {},
    handleProps: { ...attributes, ref: setActivatorNodeRef },
  };
}

export function ReorderHandle({
  name,
  className,
  ...props
}: { name: string } & ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={`Drag ${name}`}
      className={cn('cursor-grab', className)}
      {...props}
    >
      <Icon name="gripVertical" decorative />
    </Button>
  );
}
