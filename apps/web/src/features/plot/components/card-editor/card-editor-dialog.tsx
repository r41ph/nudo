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
  // null opens the dialog empty, to add a card to the plotline × beat cell.
  card: PlotCard | null;
  plotline: Plotline;
  beat: PlotBeat;
  editable: boolean;
  // Resolves when the card is saved; a rejection keeps the dialog open.
  onSave: (fields: CardFields) => Promise<unknown>;
  onCloseAutoFocus?: (event: Event) => void;
}

// Holds the form state for one opening; the board remounts it with a new key
// each time, so it always starts from the card.
export function CardEditorDialog({
  open,
  onOpenChange,
  card,
  plotline,
  beat,
  editable,
  onSave,
  onCloseAutoFocus,
}: CardEditorDialogProps) {
  const initialTitle = card?.title ?? '';
  const initialDescription = card?.description ?? '';
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();

  const dirty = title !== initialTitle || description !== initialDescription;

  const close = () => onOpenChange(false);
  const requestClose = () => {
    if (dirty) setConfirmingDiscard(true);
    else close();
  };
  const guardClose = (event: Event) => {
    if (!dirty) return;
    event.preventDefault();
    setConfirmingDiscard(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await onSave({ title: title.trim(), description });
      close();
    } catch {
      // The mutation's onError already toasts; this keeps the reason in view.
      setError("Couldn't save the card — try again.");
      setPending(false);
    }
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
            <span
              aria-hidden
              className={cn(
                'size-2.5 shrink-0 rounded-full',
                PLOTLINE_COLOR_DOT_CLASS[plotline.color]
              )}
            />
            {`${plotline.name} · ${beat.name}`}
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
          {error && (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            {confirmingDiscard ? (
              <DiscardConfirm
                onKeep={() => {
                  // Before the confirm unmounts, or focus drops to <body>.
                  titleRef.current?.focus();
                  setConfirmingDiscard(false);
                }}
                onDiscard={close}
              />
            ) : (
              <>
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

function DiscardConfirm({
  onKeep,
  onDiscard,
}: {
  onKeep: () => void;
  onDiscard: () => void;
}) {
  const keepRef = useRef<HTMLButtonElement>(null);
  // Focus lands on the safe choice, so Enter does not lose the text. Not
  // autoFocus: focusing mid-commit, after Escape, upsets Radix's focus trap.
  useEffect(() => keepRef.current?.focus(), []);

  return (
    <div
      role="group"
      aria-label="Discard changes?"
      className="flex w-full items-center justify-end gap-2"
    >
      <p className="mr-auto text-sm text-foreground">Discard changes?</p>
      <Button ref={keepRef} type="button" variant="outline" onClick={onKeep}>
        Keep editing
      </Button>
      <Button type="button" variant="destructive" onClick={onDiscard}>
        Discard
      </Button>
    </div>
  );
}
