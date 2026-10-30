import { useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PlusIcon } from 'lucide-react';
import { Button } from '@ui/components/ui/button';
import { cn } from '@ui/lib/utils';
import { PlotCard } from '@web/features/plot/components/board/plot-card';
import {
  cellDroppableId,
  type PlotDragData,
} from '@web/features/plot/lib/plot-dnd';
import { cellKey } from '@web/features/plot/lib/plot.utils';
import type {
  PlotCard as PlotCardData,
  PlotCell as PlotCellPosition,
  PlotFocusRequest,
  PlotlineColor,
} from '@web/features/plot/plot.types';

interface PlotCellProps {
  cell: PlotCellPosition;
  cards: readonly PlotCardData[];
  color: PlotlineColor;
  editable: boolean;
  isDropTarget: boolean;
  focusRequest: PlotFocusRequest | null;
  onAddCard: () => void;
  onOpenCard: (card: PlotCardData) => void;
}

// Opacity rather than `hidden` so Add card stays in the tab order; touch
// screens have no hover to reveal it.
const ADD_CARD =
  'mt-auto w-full border border-dashed border-border text-muted-foreground opacity-0 transition-opacity ' +
  'group-hover/cell:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100';

export function PlotCell({
  cell,
  cards,
  color,
  editable,
  isDropTarget,
  focusRequest,
  onAddCard,
  onOpenCard,
}: PlotCellProps) {
  const addRef = useRef<HTMLButtonElement>(null);
  const data: PlotDragData = { type: 'cell', cell };
  const { setNodeRef } = useDroppable({
    id: cellDroppableId(cell),
    data,
    disabled: !editable,
  });
  const empty = cards.length === 0;
  const key = cellKey(cell);
  const focusesAdd =
    focusRequest && 'cellKey' in focusRequest && focusRequest.cellKey === key;

  useEffect(() => {
    if (focusesAdd) addRef.current?.focus();
  }, [focusesAdd, focusRequest?.nonce]);

  return (
    <div
      ref={setNodeRef}
      role="cell"
      className={cn(
        'group/cell flex min-h-24 flex-col gap-2 border-b border-border p-2',
        empty &&
          editable &&
          'transition-colors hover:bg-muted/60 focus-within:bg-muted/60',
        isDropTarget && 'bg-accent outline-2 -outline-offset-2 outline-ring'
      )}
    >
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        {cards.map((card) => (
          <PlotCard
            key={card.id}
            card={card}
            cell={cell}
            color={color}
            editable={editable}
            onOpen={() => onOpenCard(card)}
            focusNonce={
              focusRequest &&
              'cardId' in focusRequest &&
              focusRequest.cardId === card.id
                ? focusRequest.nonce
                : undefined
            }
          />
        ))}
      </SortableContext>
      {editable && (
        <Button
          ref={addRef}
          variant="ghost"
          size="sm"
          className={ADD_CARD}
          onClick={onAddCard}
        >
          <PlusIcon aria-hidden />
          Add card
        </Button>
      )}
    </div>
  );
}
