import { countLabel } from '@web/features/plot/lib/plot.utils';

interface PlotFilterRowProps {
  name: string;
  // Plotlines only; beats show no count.
  cardCount?: number;
}

export function PlotFilterRow({ name, cardCount }: PlotFilterRowProps) {
  return (
    <li className="flex h-8.5 items-center gap-2 rounded-lg pr-2.5 pl-7">
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {name}
      </span>
      {cardCount !== undefined && (
        <span className="shrink-0 text-xs text-muted-foreground">
          <span aria-hidden>{cardCount}</span>
          <span className="sr-only">{countLabel(cardCount, 'card')}</span>
        </span>
      )}
    </li>
  );
}
