import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteProjectDialog } from '@web/features/project/components/delete-project-dialog';

function renderDialog({
  documentCount = 23,
  onConfirm = vi.fn().mockResolvedValue(undefined),
}: {
  documentCount?: number;
  onConfirm?: () => Promise<unknown>;
} = {}) {
  const onOpenChange = vi.fn();
  render(
    <DeleteProjectDialog
      open
      onOpenChange={onOpenChange}
      title="The Lamp"
      documentCount={documentCount}
      onConfirm={onConfirm}
    />
  );
  return {
    onOpenChange,
    onConfirm,
    input: screen.getByLabelText('Type the title to confirm'),
    deleteButton: () => screen.getByRole('button', { name: /^Delet/ }),
  };
}

describe('DeleteProjectDialog', () => {
  it('names the project and its document count', () => {
    renderDialog();

    expect(
      screen.getByRole('alertdialog', { name: 'Delete “The Lamp”?' })
    ).toHaveTextContent("This removes its 23 documents and can't be undone.");
  });

  it('uses the singular for one document', () => {
    renderDialog({ documentCount: 1 });

    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      "This removes its 1 document and can't be undone."
    );
  });

  it('keeps Delete disabled until the typed title matches', async () => {
    const { input, deleteButton } = renderDialog();
    expect(deleteButton()).toBeDisabled();

    await userEvent.type(input, 'The Lam');
    expect(deleteButton()).toBeDisabled();

    await userEvent.type(input, 'p');
    expect(deleteButton()).toBeEnabled();
  });

  it('ignores case and surrounding whitespace when matching', async () => {
    const { input, deleteButton } = renderDialog();

    await userEvent.type(input, '  the LAMP ');

    expect(deleteButton()).toBeEnabled();
  });

  it('deletes and closes once the title matches', async () => {
    const { input, deleteButton, onConfirm, onOpenChange } = renderDialog();

    await userEvent.type(input, 'The Lamp');
    await userEvent.click(deleteButton());

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows a pending state while deleting', async () => {
    const { input, deleteButton } = renderDialog({
      onConfirm: () => new Promise(() => {}),
    });

    await userEvent.type(input, 'The Lamp{Enter}');

    expect(deleteButton()).toHaveTextContent('Deleting…');
    expect(deleteButton()).toBeDisabled();
  });

  it('stays open when the delete fails', async () => {
    const { input, deleteButton, onOpenChange } = renderDialog({
      onConfirm: vi.fn().mockRejectedValue(new Error('boom')),
    });

    await userEvent.type(input, 'The Lamp');
    await userEvent.click(deleteButton());

    expect(deleteButton()).toBeEnabled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
