import { memo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ui/components/ui/alert-dialog';

interface DeleteNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  descendantCount: number;
  onConfirm: () => void;
}

// Names the exact blast radius rather than "and its contents". Radix focuses
// Cancel on open, so the destructive button is never the default target.
export const DeleteNodeDialog = memo(function DeleteNodeDialog({
  open,
  onOpenChange,
  title,
  descendantCount,
  onConfirm,
}: DeleteNodeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {descendantCount > 0
              ? `This also deletes ${descendantCount} ${
                  descendantCount === 1 ? 'document' : 'documents'
                } inside it. This can't be undone.`
              : "This can't be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});
