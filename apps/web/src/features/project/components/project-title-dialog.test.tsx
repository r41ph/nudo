import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectTitleDialog } from '@web/features/project/components/project-title-dialog';

function renderDialog(onSave: (title: string) => Promise<unknown>) {
  const onOpenChange = vi.fn();
  render(
    <ProjectTitleDialog
      open
      onOpenChange={onOpenChange}
      heading="Rename project"
      defaultTitle="The Lamp"
      onSave={onSave}
    />
  );
  return { onOpenChange, input: screen.getByLabelText('Title') };
}

describe('ProjectTitleDialog', () => {
  it('saves the trimmed title and closes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { onOpenChange, input } = renderDialog(onSave);
    expect(input).toHaveValue('The Lamp');

    await userEvent.clear(input);
    await userEvent.type(input, '  The Lantern  ');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith('The Lantern');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it.each(['', '   '])('rejects the title %j inline', async (title) => {
    const onSave = vi.fn();
    const { onOpenChange, input } = renderDialog(onSave);

    await userEvent.clear(input);
    if (title) await userEvent.type(input, title);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a title.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onSave).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('shows a pending state while saving', async () => {
    const { input } = renderDialog(() => new Promise(() => {}));

    await userEvent.type(input, '{Enter}');

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('stays open with an inline error when the save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('boom'));
    const { onOpenChange } = renderDialog(onSave);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't save the title — try again."
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
