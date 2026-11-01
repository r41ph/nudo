import { useId, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PlusIcon } from 'lucide-react';
import { Button } from '@ui/components/ui/button';
import { cn } from '@ui/lib/utils';
import { CardEditorDialog } from '@web/features/plot/components/card-editor/card-editor-dialog';
import type { CardPlacement } from '@web/features/plot/components/card-editor/card-location';
import { BeatHeader } from '@web/features/plot/components/board/beat-header';
import { PlotCardFace } from '@web/features/plot/components/board/plot-card';
import { PlotCell } from '@web/features/plot/components/board/plot-cell';
import { PlotMinimap } from '@web/features/plot/components/board/plot-minimap';
import { PlotlineLabel } from '@web/features/plot/components/board/plotline-label';
import {
  PLOT_DRAG_INSTRUCTIONS,
  PLOT_DRAG_KEYS,
  PLOTLINE_COLOR_DOT_CLASS,
  PLOT_BEAT_COLUMN_WIDTH,
  PLOT_LABEL_COLUMN_WIDTH,
  PLOT_VIEW_ONLY_MESSAGE,
} from '@web/features/plot/constants/plot.constants';
import { usePlotEditable } from '@web/features/plot/hooks/use-plot-editable';
import { usePlotMutations } from '@web/features/plot/hooks/use-plot-mutations';
import {
  cardDrop,
  dragTypeOf,
  dropTargetOf,
  plotAnnouncements,
  plotCollision,
  reorderedIds,
  type PlotDragType,
} from '@web/features/plot/lib/plot-dnd';
import {
  cellKey,
  groupCardsByCell,
  moveId,
  visiblePlot,
} from '@web/features/plot/lib/plot.utils';
import { usePlotView } from '@web/features/plot/state/plot-view.store';
import type {
  Plot,
  PlotCard,
  PlotFocusRequest,
} from '@web/features/plot/plot.types';

interface EditorTarget {
  // Remounts the dialog per opening, so its form starts from this card.
  session: number;
  card: PlotCard | null;
  placement: CardPlacement;
}

interface PlotBoardProps {
  projectId: string;
  plot: Plot;
  refreshFailed?: boolean;
  onRetry?: () => void;
}

// The scroller's left gutter would show cells sliding past the sticky label
// column; this shadow paints the page background over it.
const COVER_GUTTER = 'shadow-[-2.5rem_0_0_0_var(--background)]';

export function PlotBoard({
  projectId,
  plot,
  refreshFailed = false,
  onRetry,
}: PlotBoardProps) {
  const {
    addPlotline,
    updatePlotline,
    reorderPlotlines,
    deletePlotline,
    updateBeat,
    reorderBeats,
    deleteBeat,
    createCard,
    updateCard,
    relocateCard,
    deleteCard,
    moveCard,
  } = usePlotMutations(projectId);
  const { view, showAll } = usePlotView(projectId);
  const editable = usePlotEditable();
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const sessionRef = useRef(0);
  const deletedRef = useRef(false);
  const [focusRequest, setFocusRequest] = useState<PlotFocusRequest | null>(
    null
  );
  const focusNonceRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollContainerId = useId();
  const requestFocus = (target: { cardId: string } | { cellKey: string }) => {
    focusNonceRef.current += 1;
    setFocusRequest({ nonce: focusNonceRef.current, ...target });
  };
  const [dragging, setDragging] = useState<{
    id: string;
    type: PlotDragType | null;
  } | null>(null);
  // A cell key while a card is dragged, else the hovered row or column id.
  const [overKey, setOverKey] = useState<string | null>(null);
  const sensors = useSensors(
    // The distance keeps a click a click, so it still opens the editor.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: PLOT_DRAG_KEYS,
    })
  );
  const dragType = dragging?.type ?? null;
  const endDrag = () => {
    setDragging(null);
    setOverKey(null);
  };
  const draggingCard = plot.cards.find((c) => c.id === dragging?.id);
  const draggingPlotline = plot.plotlines.find(
    (p) => p.id === (draggingCard?.plotlineId ?? dragging?.id)
  );
  const draggingBeat = plot.beats.find((b) => b.id === dragging?.id);

  const openEditor = (card: PlotCard | null, placement: CardPlacement) => {
    sessionRef.current += 1;
    deletedRef.current = false;
    setEditor({ card, placement, session: sessionRef.current });
    setEditorOpen(true);
  };

  const saveCard = async (
    card: PlotCard | null,
    fields: { title: string; description: string },
    placement: CardPlacement
  ) => {
    if (!card) return createCard(placement, fields);
    if (fields.title !== card.title || fields.description !== card.description)
      await updateCard(card.id, fields);
    if (
      placement.plotlineId !== card.plotlineId ||
      placement.beatId !== card.beatId
    )
      await relocateCard(card.id, placement);
  };
  // Only visible rows and columns render, but every reorder (drag, Move,
  // first/last) works on the full order so hidden items keep their places.
  const visible = visiblePlot(plot, view);
  // A plot with no plotlines or no beats has nothing to hide; it keeps its
  // usual empty layout.
  const everythingHidden =
    (plot.plotlines.length > 0 && visible.plotlines.length === 0) ||
    (plot.beats.length > 0 && visible.beats.length === 0);
  const plotlineIds = plot.plotlines.map((p) => p.id);
  const beatIds = plot.beats.map((b) => b.id);
  const cells = groupCardsByCell(plot.cards);
  const countBy = (key: 'plotlineId' | 'beatId', id: string) =>
    plot.cards.filter((card) => card[key] === id).length;
  const gridTemplateColumns = `${PLOT_LABEL_COLUMN_WIDTH}px repeat(${visible.beats.length}, ${PLOT_BEAT_COLUMN_WIDTH}px)`;

  return (
    <div className="flex h-svh min-w-0 flex-1 flex-col pt-10">
      {/* The visible title and summary live in the sidebar now; the page
          still needs a heading to navigate by. */}
      <h1 className="sr-only">Plot</h1>
      {refreshFailed && (
        <div
          role="alert"
          className="mx-10 mb-4 flex items-center justify-between gap-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
        >
          Couldn&apos;t refresh your plot.
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
      {!editable && (
        <p className="mx-10 mb-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {PLOT_VIEW_ONLY_MESSAGE}
        </p>
      )}
      {everythingHidden ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-10 py-16 text-center">
          <p className="text-sm text-muted-foreground">Everything is hidden.</p>
          <Button variant="outline" size="sm" onClick={() => showAll()}>
            Show all
          </Button>
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            id={scrollContainerId}
            className="min-h-0 flex-1 overflow-auto px-10 pb-8"
          >
            <DndContext
              sensors={sensors}
              collisionDetection={plotCollision}
              accessibility={{
                announcements: plotAnnouncements(plot),
                screenReaderInstructions: {
                  draggable: PLOT_DRAG_INSTRUCTIONS,
                },
              }}
              onDragStart={({ active }) =>
                setDragging({ id: String(active.id), type: dragTypeOf(active) })
              }
              onDragOver={({ active, over }) => {
                if (dragTypeOf(active) === 'card') {
                  const target = dropTargetOf(over);
                  setOverKey(target ? cellKey(target.data.cell) : null);
                } else {
                  setOverKey(
                    over && over.id !== active.id ? String(over.id) : null
                  );
                }
              }}
              onDragEnd={({ active, over }) => {
                endDrag();
                const id = String(active.id);
                const type = dragTypeOf(active);
                if (type === 'card') {
                  const drop = cardDrop(plot.cards, id, dropTargetOf(over));
                  if (!drop?.moved) return;
                  moveCard(id, drop.to, drop.orderedIds.indexOf(id));
                  // A card that changed cells remounts and would lose focus.
                  requestFocus({ cardId: id });
                  return;
                }
                if (!over) return;
                const ids = type === 'plotline' ? plotlineIds : beatIds;
                const reordered = reorderedIds(ids, id, over.id);
                if (!reordered) return;
                if (type === 'plotline') reorderPlotlines(reordered);
                else reorderBeats(reordered);
              }}
              onDragCancel={endDrag}
            >
              <div
                ref={gridRef}
                role="table"
                aria-label="Plot board"
                className="grid w-max"
                style={{ gridTemplateColumns }}
              >
                <div role="row" className="contents">
                  <div
                    role="none"
                    className={cn(
                      'sticky top-0 left-0 z-20 border-b border-border bg-background',
                      COVER_GUTTER
                    )}
                  />
                  <SortableContext
                    items={visible.beats.map((b) => b.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {visible.beats.map((beat) => (
                      <BeatHeader
                        key={beat.id}
                        beat={beat}
                        editable={editable}
                        hasCards={countBy('beatId', beat.id) > 0}
                        isFirst={beat.id === beatIds[0]}
                        isLast={beat.id === beatIds.at(-1)}
                        onRename={(name) => updateBeat(beat.id, { name })}
                        onMove={(delta) =>
                          reorderBeats(moveId(beatIds, beat.id, delta))
                        }
                        onDelete={() => deleteBeat(beat)}
                        dragType={dragType}
                        isDropTarget={
                          dragType === 'beat' && overKey === beat.id
                        }
                        className="sticky top-0 z-10"
                      />
                    ))}
                  </SortableContext>
                </div>
                <SortableContext
                  items={visible.plotlines.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {visible.plotlines.map((plotline) => (
                    <div key={plotline.id} role="row" className="contents">
                      <PlotlineLabel
                        plotline={plotline}
                        cardCount={countBy('plotlineId', plotline.id)}
                        editable={editable}
                        isFirst={plotline.id === plotlineIds[0]}
                        isLast={plotline.id === plotlineIds.at(-1)}
                        onRename={(name) =>
                          updatePlotline(plotline.id, { name })
                        }
                        onColorChange={(color) =>
                          updatePlotline(plotline.id, { color })
                        }
                        onMove={(delta) =>
                          reorderPlotlines(
                            moveId(plotlineIds, plotline.id, delta)
                          )
                        }
                        onDelete={() => deletePlotline(plotline)}
                        dragType={dragType}
                        isDropTarget={
                          dragType === 'plotline' && overKey === plotline.id
                        }
                        className={cn(
                          'sticky left-0 z-10 col-start-1',
                          COVER_GUTTER
                        )}
                      />
                      {visible.beats.map((beat) => (
                        <PlotCell
                          key={beat.id}
                          cell={{ plotlineId: plotline.id, beatId: beat.id }}
                          focusRequest={focusRequest}
                          dragType={dragType}
                          isDropTarget={
                            dragType === 'card' &&
                            overKey ===
                              cellKey({
                                plotlineId: plotline.id,
                                beatId: beat.id,
                              })
                          }
                          cards={
                            cells.get(
                              cellKey({
                                plotlineId: plotline.id,
                                beatId: beat.id,
                              })
                            ) ?? []
                          }
                          color={plotline.color}
                          editable={editable}
                          onAddCard={() =>
                            openEditor(null, {
                              plotlineId: plotline.id,
                              beatId: beat.id,
                            })
                          }
                          onOpenCard={(card) =>
                            openEditor(card, {
                              plotlineId: plotline.id,
                              beatId: beat.id,
                            })
                          }
                        />
                      ))}
                    </div>
                  ))}
                </SortableContext>
              </div>
              <DragOverlay>
                {draggingCard && draggingPlotline ? (
                  <div className="flex flex-col rounded-md border border-border bg-card p-3 shadow-lg">
                    <PlotCardFace
                      card={draggingCard}
                      color={draggingPlotline.color}
                    />
                  </div>
                ) : (
                  (draggingPlotline || draggingBeat) && (
                    <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-lg">
                      {draggingPlotline && (
                        <span
                          aria-hidden
                          className={cn(
                            'size-3 shrink-0 rounded-full',
                            PLOTLINE_COLOR_DOT_CLASS[draggingPlotline.color]
                          )}
                        />
                      )}
                      {draggingPlotline?.name ?? draggingBeat?.name}
                    </div>
                  )
                )}
              </DragOverlay>
            </DndContext>
            {editable && (
              <Button
                variant="ghost"
                size="sm"
                className="sticky left-0 mt-2"
                onClick={addPlotline}
              >
                <PlusIcon aria-hidden />
                Plotline
              </Button>
            )}
          </div>
          <PlotMinimap
            containerRef={scrollRef}
            scrollContainerId={scrollContainerId}
            gridRef={gridRef}
            plot={visible}
            dragging={dragging !== null}
          />
        </div>
      )}
      {editor && (
        <CardEditorDialog
          key={editor.session}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          card={editor.card}
          placement={editor.placement}
          plotlines={plot.plotlines}
          beats={plot.beats}
          editable={editable}
          onSave={(fields, placement) =>
            saveCard(editor.card, fields, placement)
          }
          onDelete={async () => {
            if (!editor.card) return;
            await deleteCard(editor.card.id);
            deletedRef.current = true;
          }}
          // The dialog has no DialogTrigger, so Radix cannot restore focus.
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            requestFocus(
              editor.card && !deletedRef.current
                ? { cardId: editor.card.id }
                : { cellKey: cellKey(editor.placement) }
            );
          }}
        />
      )}
    </div>
  );
}
