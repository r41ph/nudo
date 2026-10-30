import { PlusIcon } from 'lucide-react';
import { Button } from '@ui/components/ui/button';
import { cn } from '@ui/lib/utils';
import { PlotCard } from '@web/features/plot/components/board/plot-card';
import type {
  PlotCard as PlotCardData,
  PlotlineColor,
} from '@web/features/plot/plot.types';

interface PlotCellProps {
  cards: readonly PlotCardData[];
  color: PlotlineColor;
  editable: boolean;
  onAddCard: (trigger: HTMLElement) => void;
  onOpenCard: (card: PlotCardData, trigger: HTMLElement) => void;
}

// Opacity rather than `hidden` so Add card stays in the tab order; touch
// screens have no hover to reveal it.
const ADD_CARD =
  'mt-auto w-full border border-dashed border-border text-muted-foreground opacity-0 transition-opacity ' +
  'group-hover/cell:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100';

export function PlotCell({
  cards,
  color,
  editable,
  onAddCard,
  onOpenCard,
}: PlotCellProps) {
  const empty = cards.length === 0;

  return (
    <div
      role="cell"
      className={cn(
        'group/cell flex min-h-24 flex-col gap-2 border-b border-border p-2',
        empty &&
          editable &&
          'transition-colors hover:bg-muted/60 focus-within:bg-muted/60'
      )}
    >
      {cards.map((card) => (
        <PlotCard
          key={card.id}
          card={card}
          color={color}
          onOpen={(trigger) => onOpenCard(card, trigger)}
        />
      ))}
      {editable && (
        <Button
          variant="ghost"
          size="sm"
          className={ADD_CARD}
          onClick={(event) => onAddCard(event.currentTarget)}
        >
          <PlusIcon aria-hidden />
          Add card
        </Button>
      )}
    </div>
  );
}
