import { useId } from 'react';
import { Button } from '@ui/components/ui/button';
import { cn } from '@ui/lib/utils';
import { PLOTLINE_COLOR_DOT_CLASS } from '@web/features/plot/constants/plot.constants';
import type {
  PlotCard as PlotCardData,
  PlotlineColor,
} from '@web/features/plot/plot.types';

interface PlotCardProps {
  card: PlotCardData;
  color: PlotlineColor;
  onOpen: (trigger: HTMLElement) => void;
}

// Named and described by id: a heading inside a button is invalid, and
// button content is flattened into one long name otherwise.
export function PlotCard({ card, color, onOpen }: PlotCardProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Button
      variant="outline"
      aria-labelledby={titleId}
      aria-describedby={card.description ? descriptionId : undefined}
      onClick={(event) => onOpen(event.currentTarget)}
      className="h-auto w-full flex-col items-stretch gap-0 whitespace-normal bg-card p-3 text-left font-normal dark:bg-card"
    >
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
    </Button>
  );
}
