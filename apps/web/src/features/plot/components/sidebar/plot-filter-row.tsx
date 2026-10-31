import { useEffect, useRef } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@ui/components/ui/button';
import { countLabel } from '@web/features/plot/lib/plot.utils';

interface PlotFilterRowProps {
  name: string;
  // Plotlines only; beats show no count.
  cardCount?: number;
  // Set on the row just created from New, which may land below the fold.
  scrollIntoViewOnMount?: boolean;
}

export function PlotFilterRow({
  name,
  cardCount,
  scrollIntoViewOnMount = false,
}: PlotFilterRowProps) {
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (scrollIntoViewOnMount)
      ref.current?.scrollIntoView({ block: 'nearest' });
  }, [scrollIntoViewOnMount]);

  return (
    <li
      ref={ref}
      className="flex h-8.5 items-center gap-2 rounded-lg pr-2.5 pl-7"
    >
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
