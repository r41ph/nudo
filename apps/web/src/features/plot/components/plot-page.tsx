import { Button } from '@ui/components/ui/button';
import { Skeleton } from '@ui/components/ui/skeleton';
import { PlotBoard } from '@web/features/plot/components/board/plot-board';
import { PlotEmpty } from '@web/features/plot/components/plot-empty';
import { usePlot } from '@web/features/plot/hooks/use-plot';
import { usePlotEditable } from '@web/features/plot/hooks/use-plot-editable';
import { usePlotMutations } from '@web/features/plot/hooks/use-plot-mutations';
import { useProjectId } from '@web/shared/hooks/use-project-id';

export function PlotPage() {
  const projectId = useProjectId()!;
  const { data: plot, isPending, isError, refetch } = usePlot(projectId);
  const { startPlot } = usePlotMutations(projectId);
  const editable = usePlotEditable();

  if (isPending) {
    return (
      <div aria-label="Loading plot" className="flex-1 space-y-4 px-10 py-8">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Falling through to the empty state would offer Start plot on a project
  // that may already have one.
  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-1 flex-col items-center justify-center gap-4 py-16"
      >
        <p className="text-destructive">Couldn&apos;t load your plot.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (plot.plotlines.length === 0 && plot.beats.length === 0) {
    return (
      <PlotEmpty
        editable={editable}
        onStart={() => startPlot.mutate()}
        starting={startPlot.isPending}
      />
    );
  }

  return <PlotBoard projectId={projectId} plot={plot} />;
}
