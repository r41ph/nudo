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
  // A sidebar row's body toggles its checkbox, so only its handle may drag.
  activator?: 'container' | 'handle';
}

type ContainerProps = {
  ref?: (node: HTMLElement | null) => void;
} & Partial<NonNullable<ReturnType<typeof useSortable>['listeners']>>;

// On the board the whole label or header is the pointer target; the handle
// is the keyboard one, since a plain div is not focusable.
export function useReorderSortable({
  id,
  type,
  editable,
  dragType,
  paused,
  activator = 'container',
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

  const onHandle = activator === 'handle';
  const containerProps: ContainerProps = editable
    ? { ref: setNodeRef, ...(onHandle ? {} : listeners) }
    : {};
  return {
    isDragging,
    containerProps,
    handleProps: {
      ...attributes,
      ...(onHandle ? listeners : {}),
      ref: setActivatorNodeRef,
    },
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
