import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Button } from '@ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/components/ui/dialog';
import { Input } from '@ui/components/ui/input';
import { Label } from '@ui/components/ui/label';
import { Textarea } from '@ui/components/ui/textarea';
import { cn } from '@ui/lib/utils';
import {
  CardLocation,
  type CardPlacement,
} from '@web/features/plot/components/card-editor/card-location';
import {
  PLOTLINE_COLOR_DOT_CLASS,
  PLOT_CARD_TITLE_MAX_LENGTH,
} from '@web/features/plot/constants/plot.constants';
import type {
  PlotBeat,
  PlotCard,
  Plotline,
} from '@web/features/plot/plot.types';

export interface CardFields {
  title: string;
  description: string;
}

interface CardEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // null opens the dialog empty, to add a card to `placement`.
  card: PlotCard | null;
  placement: CardPlacement;
  plotlines: readonly Plotline[];
  beats: readonly PlotBeat[];
  editable: boolean;
  // Each resolves when saved; a rejection keeps the dialog open.
  onSave: (fields: CardFields, placement: CardPlacement) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  onCloseAutoFocus?: (event: Event) => void;
}

type FooterMode = 'edit' | 'discard' | 'delete';

// Holds the form state for one opening; the board remounts it with a new key
// each time, so it always starts from the card.
export function CardEditorDialog({
  open,
  onOpenChange,
  card,
  placement: initialPlacement,
  plotlines,
  beats,
  editable,
  onSave,
  onDelete,
  onCloseAutoFocus,
}: CardEditorDialogProps) {
  const initialTitle = card?.title ?? '';
  const initialDescription = card?.description ?? '';
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [placement, setPlacement] = useState(initialPlacement);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<FooterMode>('edit');
  const titleRef = useRef<HTMLInputElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  // Where focus goes when a footer confirm closes. A name, not an element:
  // the Delete button is unmounted while its confirm shows.
  const returnFocusRef = useRef<'title' | 'delete' | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();

  const plotline = plotlines.find((p) => p.id === placement.plotlineId);
  const beat = beats.find((b) => b.id === placement.beatId);
  const dirty =
    title !== initialTitle ||
    description !== initialDescription ||
    placement.plotlineId !== initialPlacement.plotlineId ||
    placement.beatId !== initialPlacement.beatId;

  useEffect(() => {
    if (mode !== 'edit' || !returnFocusRef.current) return;
    const target = returnFocusRef.current === 'title' ? titleRef : deleteRef;
    target.current?.focus();
    returnFocusRef.current = null;
  }, [mode]);

  const close = () => onOpenChange(false);
  const backToEdit = (focus: 'title' | 'delete') => {
    returnFocusRef.current = focus;
    setMode('edit');
  };
  const requestClose = () => {
    if (dirty) setMode('discard');
    else close();
  };
  const guardClose = (event: Event) => {
    if (!dirty || mode === 'delete') return;
    event.preventDefault();
    setMode('discard');
  };

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setError(null);
    setPending(true);
    try {
      await action();
      close();
    } catch {
      // The mutation's onError already toasts; this keeps the reason in view.
      setError(failure);
      setPending(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void run(
      () => onSave({ title: title.trim(), description }, placement),
      "Couldn't save the card — try again."
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-lg"
        onEscapeKeyDown={guardClose}
        onInteractOutside={guardClose}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>Edit card</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {plotline && (
              <span
                aria-hidden
                className={cn(
                  'size-2.5 shrink-0 rounded-full',
                  PLOTLINE_COLOR_DOT_CLASS[plotline.color]
                )}
              />
            )}
            {`${plotline?.name} · ${beat?.name}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={titleId}>Title</Label>
            <Input
              ref={titleRef}
              id={titleId}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={!editable}
              maxLength={PLOT_CARD_TITLE_MAX_LENGTH}
              autoComplete="off"
              className="font-newsreader"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={descriptionId}>Description (optional)</Label>
            <Textarea
              id={descriptionId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              readOnly={!editable}
              className="max-h-80"
            />
          </div>
          <CardLocation
            plotlines={plotlines}
            beats={beats}
            value={placement}
            onChange={setPlacement}
            editable={editable}
          />
          {error && (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            {mode === 'discard' && (
              <InlineConfirm
                message="Discard changes?"
                keepLabel="Keep editing"
                confirmLabel="Discard"
                onKeep={() => backToEdit('title')}
                onConfirm={close}
              />
            )}
            {mode === 'delete' && (
              <InlineConfirm
                message="Delete this card? This can't be undone."
                keepLabel="Keep"
                confirmLabel={pending ? 'Deleting…' : 'Delete card'}
                pending={pending}
                onKeep={() => backToEdit('delete')}
                onConfirm={() =>
                  void run(onDelete, "Couldn't delete the card — try again.")
                }
              />
            )}
            {mode === 'edit' && (
              <>
                {editable && card && (
                  <Button
                    ref={deleteRef}
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive sm:mr-auto"
                    onClick={() => {
                      setError(null);
                      setMode('delete');
                    }}
                  >
                    Delete
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={requestClose}>
                  {editable ? 'Cancel' : 'Close'}
                </Button>
                {editable && (
                  <Button
                    type="submit"
                    disabled={pending}
                    aria-describedby={error ? errorId : undefined}
                  >
                    {pending ? 'Saving…' : 'Save'}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InlineConfirm({
  message,
  keepLabel,
  confirmLabel,
  pending = false,
  onKeep,
  onConfirm,
}: {
  message: string;
  keepLabel: string;
  confirmLabel: string;
  pending?: boolean;
  onKeep: () => void;
  onConfirm: () => void;
}) {
  const keepRef = useRef<HTMLButtonElement>(null);
  // Focus lands on the safe choice, so Enter does not lose anything. Not
  // autoFocus: focusing mid-commit, after Escape, upsets Radix's focus trap.
  useEffect(() => keepRef.current?.focus(), []);

  return (
    <div
      role="group"
      aria-label={message}
      className="flex w-full items-center justify-end gap-2"
    >
      <p className="mr-auto text-sm text-foreground">{message}</p>
      <Button ref={keepRef} type="button" variant="outline" onClick={onKeep}>
        {keepLabel}
      </Button>
      <Button
        type="button"
        variant="destructive"
        disabled={pending}
        onClick={onConfirm}
      >
        {confirmLabel}
      </Button>
    </div>
  );
}
