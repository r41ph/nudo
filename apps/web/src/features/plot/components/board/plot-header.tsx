import { PlusIcon } from 'lucide-react';
import { Button } from '@ui/components/ui/button';
import { countLabel } from '@web/features/plot/lib/plot.utils';

interface PlotHeaderProps {
  plotlineCount: number;
  beatCount: number;
  cardCount: number;
  editable: boolean;
  onAddBeat: () => void;
  onAddPlotline: () => void;
}

export function PlotHeader({
  plotlineCount,
  beatCount,
  cardCount,
  editable,
  onAddBeat,
  onAddPlotline,
}: PlotHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 px-10 py-8">
      <div className="flex items-baseline gap-3">
        <h1 className="font-newsreader text-2xl font-semibold text-foreground">
          Plot
        </h1>
        <p className="text-sm text-muted-foreground">
          {[
            countLabel(plotlineCount, 'plotline'),
            countLabel(beatCount, 'beat'),
            countLabel(cardCount, 'card'),
          ].join(' · ')}
        </p>
      </div>
      {editable && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onAddBeat}>
            <PlusIcon aria-hidden />
            Add beat
          </Button>
          <Button variant="outline" size="sm" onClick={onAddPlotline}>
            <PlusIcon aria-hidden />
            Add plotline
          </Button>
        </div>
      )}
    </header>
  );
}
