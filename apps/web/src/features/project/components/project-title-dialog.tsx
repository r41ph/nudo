import { useId, useState, type FormEvent } from 'react';
import { Button } from '@ui/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/components/ui/dialog';
import { Input } from '@ui/components/ui/input';
import { Label } from '@ui/components/ui/label';
import { PROJECT_TITLE_MAX_LENGTH } from '@web/features/project/project.constants';

interface ProjectTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heading: string;
  defaultTitle?: string;
  // Resolves when the title is saved; a rejection keeps the dialog open.
  onSave: (title: string) => Promise<unknown>;
  onCloseAutoFocus?: (event: Event) => void;
}

export function ProjectTitleDialog({
  open,
  onOpenChange,
  heading,
  defaultTitle = '',
  onSave,
  onCloseAutoFocus,
}: ProjectTitleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="sm:max-w-md"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open, so every opening starts from defaultTitle. */}
        <TitleForm
          defaultTitle={defaultTitle}
          onSave={onSave}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function TitleForm({
  defaultTitle,
  onSave,
  onSaved,
}: {
  defaultTitle: string;
  onSave: (title: string) => Promise<unknown>;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputId = useId();
  const errorId = useId();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Enter a title.');
      return;
    }
    setError(null);
    setPending(true);
    try {
      await onSave(trimmed);
      onSaved();
    } catch {
      // The mutation's onError already toasts; this keeps the reason in view.
      setError("Couldn't save the title — try again.");
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={inputId}>Title</Label>
        <Input
          id={inputId}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={PROJECT_TITLE_MAX_LENGTH}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
        />
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  );
}
