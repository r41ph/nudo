import { Button } from '@ui/components/ui/button';

interface PlotEmptyProps {
  onStart: () => void;
  starting: boolean;
}

export function PlotEmpty({ onStart, starting }: PlotEmptyProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-10 py-16 text-center">
      <h2 className="font-newsreader text-2xl font-semibold text-foreground">
        Lay out your story
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Plotlines run across, beats run down the page. Pin each idea where it
        belongs, like index cards on a desk.
      </p>
      <Button onClick={onStart} disabled={starting}>
        {starting ? 'Starting…' : 'Start plot'}
      </Button>
    </div>
  );
}
