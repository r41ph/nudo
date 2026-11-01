import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  type Active,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Skeleton } from '@ui/components/ui/skeleton';
import { cn } from '@ui/lib/utils';
import { PlotCounter } from '@web/features/plot/components/sidebar/plot-counter';
import {
  PlotFilterNewRow,
  PlotFilterRow,
  type PlotDropSide,
} from '@web/features/plot/components/sidebar/plot-filter-row';
import { PlotFilterSection } from '@web/features/plot/components/sidebar/plot-filter-section';
import {
  PLOT_DRAG_INSTRUCTIONS,
  PLOT_DRAG_KEYS,
  PLOTLINE_COLOR_DOT_CLASS,
  PLOTLINE_COLOR_VAR,
} from '@web/features/plot/constants/plot.constants';
import { usePlot } from '@web/features/plot/hooks/use-plot';
import { usePlotEditable } from '@web/features/plot/hooks/use-plot-editable';
import { usePlotMutations } from '@web/features/plot/hooks/use-plot-mutations';
import {
  dragTypeOf,
  orderAnnouncements,
  reorderedIds,
} from '@web/features/plot/lib/plot-dnd';
import { plotCounterLabel } from '@web/features/plot/lib/plot.utils';
import { usePlotView } from '@web/features/plot/state/plot-view.store';
import { useProjectId } from '@web/shared/hooks/use-project-id';

type ReorderKind = 'plotline' | 'beat';

interface SidebarDrag {
  id: string;
  type: ReorderKind;
  overId: string | null;
}

export function PlotSidebarPanel() {
  const projectId = useProjectId()!;
  const { data: plot, isPending } = usePlot(projectId);
  const { view, toggle, showAll, isHidden } = usePlotView(projectId);
  const { addPlotline, addBeat, reorderPlotlines, reorderBeats } =
    usePlotMutations(projectId);
  const editable = usePlotEditable();
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<SidebarDrag | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: PLOT_DRAG_KEYS,
    })
  );

  if (isPending) {
    return (
      <div
        aria-label="Loading plotlines and beats"
        className="flex flex-col gap-2 px-2.5"
      >
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-6.5 w-full" />
        ))}
      </div>
    );
  }

  // The board shows the error and its Retry; repeating it here would offer
  // two buttons for one failure.
  if (!plot) return null;

  // Starting a plot stays on the board's empty state, so there is nothing to
  // list or add yet.
  const started = plot.plotlines.length > 0 || plot.beats.length > 0;
  const cardCount = (plotlineId: string) =>
    plot.cards.filter((card) => card.plotlineId === plotlineId).length;
  // Hidden items are listed too, so the full order is what the lists show.
  const plotlineIds = plot.plotlines.map((p) => p.id);
  const beatIds = plot.beats.map((b) => b.id);
  const idsOf = (type: ReorderKind) =>
    type === 'plotline' ? plotlineIds : beatIds;
  const plotlineAnnouncements = orderAnnouncements('plotline', plot.plotlines);
  const beatAnnouncements = orderAnnouncements('beat', plot.beats);
  const pick = (active: Active) =>
    dragTypeOf(active) === 'beat' ? beatAnnouncements : plotlineAnnouncements;

  // arrayMove puts the row after a target below it and before one above it.
  const dropSide = (id: string): PlotDropSide | undefined => {
    if (!drag || drag.overId !== id || drag.overId === drag.id) return;
    const ids = idsOf(drag.type);
    return ids.indexOf(drag.id) < ids.indexOf(id) ? 'after' : 'before';
  };
  const reorderOf = (type: ReorderKind, id: string) =>
    editable
      ? { id, type, dragType: drag?.type ?? null, dropSide: dropSide(id) }
      : undefined;
  const draggingPlotline = plot.plotlines.find((p) => p.id === drag?.id);
  const draggingBeat = plot.beats.find((b) => b.id === drag?.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5">
      {started && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          accessibility={{
            announcements: {
              onDragStart: (args) => pick(args.active).onDragStart(args),
              onDragOver: (args) => pick(args.active).onDragOver(args),
              onDragEnd: (args) => pick(args.active).onDragEnd(args),
              onDragCancel: (args) => pick(args.active).onDragCancel(args),
            },
            screenReaderInstructions: { draggable: PLOT_DRAG_INSTRUCTIONS },
          }}
          onDragStart={({ active }) =>
            setDrag({
              id: String(active.id),
              type: dragTypeOf(active) as ReorderKind,
              overId: null,
            })
          }
          onDragOver={({ over }) =>
            setDrag((d) => d && { ...d, overId: over ? String(over.id) : null })
          }
          onDragEnd={({ active, over }) => {
            setDrag(null);
            const type = dragTypeOf(active) as ReorderKind;
            if (!over) return;
            const reordered = reorderedIds(idsOf(type), active.id, over.id);
            if (!reordered) return;
            if (type === 'plotline') reorderPlotlines(reordered);
            else reorderBeats(reordered);
          }}
          onDragCancel={() => setDrag(null)}
        >
          <PlotFilterSection
            label="Plotlines"
            canShowAll={plot.plotlines.some((p) => isHidden('plotline', p.id))}
            onShowAll={() => showAll('plotline')}
          >
            <SortableContext
              items={plotlineIds}
              strategy={verticalListSortingStrategy}
            >
              {plot.plotlines.map((plotline) => (
                <PlotFilterRow
                  key={plotline.id}
                  name={plotline.name}
                  visible={!isHidden('plotline', plotline.id)}
                  onToggle={() => toggle('plotline', plotline.id)}
                  color={PLOTLINE_COLOR_VAR[plotline.color]}
                  cardCount={cardCount(plotline.id)}
                  scrollIntoViewOnMount={plotline.id === createdId}
                  reorder={reorderOf('plotline', plotline.id)}
                />
              ))}
            </SortableContext>
            {editable && (
              <PlotFilterNewRow
                label="New plotline"
                onClick={() => setCreatedId(addPlotline())}
              />
            )}
          </PlotFilterSection>
          <PlotFilterSection
            label="Beats"
            canShowAll={plot.beats.some((b) => isHidden('beat', b.id))}
            onShowAll={() => showAll('beat')}
          >
            <SortableContext
              items={beatIds}
              strategy={verticalListSortingStrategy}
            >
              {plot.beats.map((beat) => (
                <PlotFilterRow
                  key={beat.id}
                  name={beat.name}
                  visible={!isHidden('beat', beat.id)}
                  onToggle={() => toggle('beat', beat.id)}
                  scrollIntoViewOnMount={beat.id === createdId}
                  reorder={reorderOf('beat', beat.id)}
                />
              ))}
            </SortableContext>
            {editable && (
              <PlotFilterNewRow
                label="New beat"
                onClick={() => setCreatedId(addBeat())}
              />
            )}
          </PlotFilterSection>
          {/* Below 1280px the sidebar is a sheet whose transform would offset
              a fixed overlay, so it renders at the body instead. */}
          {createPortal(
            <DragOverlay>
              {(draggingPlotline || draggingBeat) && (
                <div className="flex h-8.5 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-lg">
                  {draggingPlotline && (
                    <span
                      aria-hidden
                      className={cn(
                        'size-3 shrink-0 rounded-full',
                        PLOTLINE_COLOR_DOT_CLASS[draggingPlotline.color]
                      )}
                    />
                  )}
                  <span className="truncate">
                    {draggingPlotline?.name ?? draggingBeat?.name}
                  </span>
                </div>
              )}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      )}
      <PlotCounter label={plotCounterLabel(plot, view)} />
    </div>
  );
}
