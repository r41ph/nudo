import { useId, useState, type FormEvent } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ui/components/ui/alert-dialog';
import { Button } from '@ui/components/ui/button';
import { Input } from '@ui/components/ui/input';
import { Label } from '@ui/components/ui/label';

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  documentCount: number;
  // Resolves when the project is deleted; a rejection keeps the dialog open.
  onConfirm: () => Promise<unknown>;
}

const normalise = (value: string) => value.trim().toLowerCase();

export function DeleteProjectDialog({
  open,
  onOpenChange,
  title,
  documentCount,
  onConfirm,
}: DeleteProjectDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {`This removes its ${documentCount} ${
              documentCount === 1 ? 'document' : 'documents'
            } and can't be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* Mounted only while open, so the typed confirmation never carries over. */}
        <ConfirmForm
          title={title}
          onConfirm={onConfirm}
          onDeleted={() => onOpenChange(false)}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}

// A plain submit button rather than AlertDialogAction, which closes the
// dialog on click before the delete has finished.
function ConfirmForm({
  title,
  onConfirm,
  onDeleted,
}: {
  title: string;
  onConfirm: () => Promise<unknown>;
  onDeleted: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [pending, setPending] = useState(false);
  const inputId = useId();
  const matches = normalise(typed) === normalise(title);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!matches || pending) return;
    setPending(true);
    try {
      await onConfirm();
      onDeleted();
    } catch {
      // The mutation's onError toasts; staying open lets the user retry.
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={inputId}>Type the title to confirm</Label>
        <Input
          id={inputId}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={title}
          autoComplete="off"
        />
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
        <Button
          type="submit"
          variant="destructive"
          disabled={!matches || pending}
        >
          {pending ? 'Deleting…' : 'Delete project'}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}
