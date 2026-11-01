import { useEffect, useId, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@ui/components/ui/button';
import { cn } from '@ui/lib/utils';
import { useIsFolding } from '@web/features/plot/components/board/plot-fold';
import { PLOTLINE_COLOR_DOT_CLASS } from '@web/features/plot/constants/plot.constants';
import {
  acceptsDrop,
  type PlotDragData,
  type PlotDragType,
} from '@web/features/plot/lib/plot-dnd';
import type {
  PlotCard as PlotCardData,
  PlotCell,
  PlotlineColor,
} from '@web/features/plot/plot.types';

interface PlotCardProps {
  card: PlotCardData;
  cell: PlotCell;
  color: PlotlineColor;
  editable: boolean;
  dragType: PlotDragType | null;
  onOpen: () => void;
  focusNonce?: number;
}

// Named and described by id: a heading inside a button is invalid, and
// button content is flattened into one long name otherwise.
export function PlotCard({
  card,
  cell,
  color,
  editable,
  dragType,
  onOpen,
  focusNonce,
}: PlotCardProps) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const data: PlotDragData = { type: 'card', cell };
  const folding = useIsFolding();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data,
    disabled: {
      draggable: !editable,
      droppable: !editable || folding || !acceptsDrop(dragType, 'card'),
    },
  });
  const describedBy = [
    card.description && descriptionId,
    editable && attributes['aria-describedby'],
  ]
    .filter(Boolean)
    .join(' ');

  // Also runs on mount, so a card that moved cells takes focus in its new one.
  useEffect(() => {
    if (focusNonce !== undefined) ref.current?.focus();
  }, [focusNonce]);

  return (
    <Button
      ref={(node) => {
        ref.current = node;
        setNodeRef(node);
      }}
      variant="outline"
      data-card-id={card.id}
      {...(editable ? { ...attributes, ...listeners } : {})}
      aria-labelledby={titleId}
      aria-describedby={describedBy || undefined}
      onClick={onOpen}
      // Space picks the card up; without this its keyup would also click it.
      onKeyUp={(event) => {
        if (editable && event.code === 'Space') event.preventDefault();
      }}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'h-auto w-full flex-col items-stretch gap-0 whitespace-normal bg-card p-3 text-left font-normal dark:bg-card',
        isDragging && 'opacity-40'
      )}
    >
      <PlotCardFace
        card={card}
        color={color}
        titleId={titleId}
        descriptionId={descriptionId}
      />
    </Button>
  );
}

export function PlotCardFace({
  card,
  color,
  titleId,
  descriptionId,
}: {
  card: PlotCardData;
  color: PlotlineColor;
  titleId?: string;
  descriptionId?: string;
}) {
  return (
    <>
      <span
        id={titleId}
        className={cn(
          'font-newsreader text-[15px] leading-snug font-medium text-foreground',
          !card.title && 'text-muted-foreground italic'
        )}
      >
        {card.title || 'Untitled card'}
      </span>
      <span
        aria-hidden
        className={cn(
          'mt-1.5 h-0.5 rounded-full',
          PLOTLINE_COLOR_DOT_CLASS[color]
        )}
      />
      {card.description && (
        <span
          id={descriptionId}
          className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground"
        >
          {card.description}
        </span>
      )}
    </>
  );
}
