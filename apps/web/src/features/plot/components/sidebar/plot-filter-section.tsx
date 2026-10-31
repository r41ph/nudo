import { useId, type ReactNode } from 'react';
import { Button } from '@ui/components/ui/button';

interface PlotFilterSectionProps {
  label: string;
  canShowAll: boolean;
  onShowAll: () => void;
  children: ReactNode;
}

// Each section owns its scroll so the other list, both headers and the
// counter stay put while one list scrolls. The minimum keeps a header and
// three rows visible when both sections have to shrink.
export function PlotFilterSection({
  label,
  canShowAll,
  onShowAll,
  children,
}: PlotFilterSectionProps) {
  const labelId = useId();

  return (
    <section className="flex min-h-[calc(2rem+3*2.125rem)] flex-initial flex-col">
      <div className="flex h-8 shrink-0 items-center justify-between gap-2 pr-0.5 pl-2.5">
        <h3
          id={labelId}
          className="text-[10.5px] font-semibold tracking-[0.12em] text-muted-foreground uppercase"
        >
          {label}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs font-normal text-muted-foreground"
          aria-label={`Show all ${label.toLowerCase()}`}
          disabled={!canShowAll}
          onClick={onShowAll}
        >
          Show all
        </Button>
      </div>
      <ul aria-labelledby={labelId} className="min-h-0 overflow-y-auto">
        {children}
      </ul>
    </section>
  );
}
