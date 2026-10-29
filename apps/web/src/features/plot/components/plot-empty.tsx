import { Button } from '@ui/components/ui/button';
import { PLOT_VIEW_ONLY_MESSAGE } from '@web/features/plot/constants/plot.constants';

interface PlotEmptyProps {
  editable: boolean;
  onStart: () => void;
  starting: boolean;
}

export function PlotEmpty({ editable, onStart, starting }: PlotEmptyProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-10 py-16 text-center">
      <h2 className="font-newsreader text-2xl font-semibold text-foreground">
        Lay out your story
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Plotlines run across, beats run down the page. Pin each idea where it
        belongs, like index cards on a desk.
      </p>
      {editable ? (
        <Button onClick={onStart} disabled={starting}>
          {starting ? 'Starting…' : 'Start plot'}
        </Button>
      ) : (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {PLOT_VIEW_ONLY_MESSAGE}
        </p>
      )}
    </div>
  );
}
