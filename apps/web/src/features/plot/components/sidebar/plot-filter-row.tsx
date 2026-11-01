import { useEffect, useRef, type CSSProperties } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@ui/components/ui/button';
import { Checkbox } from '@ui/components/ui/checkbox';
import { Label } from '@ui/components/ui/label';
import { cn } from '@ui/lib/utils';
import {
  ReorderHandle,
  useReorderSortable,
} from '@web/features/plot/components/board/reorder-handle';
import type { PlotDragType } from '@web/features/plot/lib/plot-dnd';
import { countLabel } from '@web/features/plot/lib/plot.utils';

export type PlotDropSide = 'before' | 'after';

interface PlotFilterRowReorder {
  id: string;
  type: 'plotline' | 'beat';
  dragType: PlotDragType | null;
  // Where the dragged row lands if dropped on this one.
  dropSide?: PlotDropSide;
}

interface PlotFilterRowProps {
  name: string;
  visible: boolean;
  onToggle: () => void;
  // A CSS colour: the plotline's, or prose for beats.
  color?: string;
  // Plotlines only; beats show no count.
  cardCount?: number;
  // Set on the row just created from New, which may land below the fold.
  scrollIntoViewOnMount?: boolean;
  // Present only when the plot is editable.
  reorder?: PlotFilterRowReorder;
}

// Opacity rather than `hidden` keeps the handle in the tab order; touch
// screens have no hover to reveal it.
const HANDLE_CLASS =
  'size-5 text-muted-foreground opacity-0 transition-opacity ' +
  'group-hover/row:opacity-100 group-focus-within/row:opacity-100 pointer-coarse:opacity-100';

// Ticked fills the box with the colour; unticked keeps it as an outline, so a
// hidden plotline still reads as that plotline. The dark variant has to be
// restated or the base checkbox's dark fill wins.
const CHECKBOX_CLASS =
  'border-(--filter-color) shadow-none dark:bg-transparent ' +
  'data-[state=checked]:border-(--filter-color) data-[state=checked]:bg-(--filter-color) ' +
  'dark:data-[state=checked]:bg-(--filter-color) data-[state=checked]:text-background';

export function PlotFilterRow({
  name,
  visible,
  onToggle,
  color = 'var(--prose)',
  cardCount,
  scrollIntoViewOnMount = false,
  reorder,
}: PlotFilterRowProps) {
  const ref = useRef<HTMLLIElement | null>(null);
  const { isDragging, containerProps, handleProps } = useReorderSortable({
    id: reorder?.id ?? name,
    type: reorder?.type ?? 'beat',
    editable: reorder !== undefined,
    dragType: reorder?.dragType ?? null,
    paused: false,
    activator: 'handle',
  });
  const setSortableRef = containerProps.ref;
  const setRef = (node: HTMLLIElement | null) => {
    ref.current = node;
    setSortableRef?.(node);
  };

  useEffect(() => {
    if (scrollIntoViewOnMount)
      ref.current?.scrollIntoView({ block: 'nearest' });
  }, [scrollIntoViewOnMount]);

  return (
    <li
      ref={setRef}
      data-drop={reorder?.dropSide}
      className={cn(
        'group/row relative flex h-8.5 items-center gap-2 rounded-lg pr-2.5',
        isDragging && 'opacity-40'
      )}
      style={{ '--filter-color': color } as CSSProperties}
    >
      {reorder?.dropSide && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-2 h-0.5 rounded-full bg-ring',
            reorder.dropSide === 'before' ? '-top-px' : '-bottom-px'
          )}
        />
      )}
      {/* Reserved even without a handle, so names line up with New rows. */}
      <span className="flex w-5 shrink-0 justify-center">
        {reorder && (
          <ReorderHandle
            {...handleProps}
            name={name}
            className={HANDLE_CLASS}
          />
        )}
      </span>
      <Label className="min-w-0 flex-1 cursor-pointer gap-2 font-normal">
        <Checkbox
          checked={visible}
          onCheckedChange={onToggle}
          aria-label={`Show ${name}`}
          className={CHECKBOX_CLASS}
        />
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm',
            visible ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {name}
        </span>
      </Label>
      {cardCount !== undefined && (
        <span className="shrink-0 text-xs text-muted-foreground">
          <span aria-hidden>{cardCount}</span>
          <span className="sr-only">{countLabel(cardCount, 'card')}</span>
        </span>
      )}
    </li>
  );
}

export function PlotFilterNewRow({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <li>
      <Button
        variant="ghost"
        className="h-8.5 w-full justify-start gap-2 rounded-lg pl-7 font-normal text-muted-foreground"
        onClick={onClick}
      >
        <PlusIcon aria-hidden />
        {label}
      </Button>
    </li>
  );
}
