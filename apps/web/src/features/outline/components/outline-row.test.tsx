import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'sonner';
import { renderWithProviders } from '@web/test/test-utils';
import { OutlineRow } from '@web/features/outline/components/outline-row';
import type { NodeKind, NodeStatus } from '@web/shared/types/outline.types';

const baseProps = {
  id: 'n1',
  title: 'Welcome Document',
  kind: 'document' as NodeKind,
  status: null as NodeStatus | null,
  wordCount: 43,
  descendantCount: 0,
  isOpen: false,
  isActive: false,
  onRename: () => {},
  onDelete: () => {},
  onAddChild: () => {},
  onSetStatus: () => {},
  onToggle: () => {},
};

function renderRow(over: Partial<typeof baseProps> = {}) {
  return renderWithProviders(
    <>
      <OutlineRow {...baseProps} {...over} />
      <Toaster />
    </>
  );
}

/** Open the row's `⋯` menu and click one of its items. */
async function chooseMenuItem(
  user: ReturnType<typeof userEvent.setup>,
  rowTitle: string,
  item: string | RegExp
) {
  await user.click(
    screen.getByRole('button', { name: `Actions for ${rowTitle}` })
  );
  await user.click(await screen.findByRole('menuitem', { name: item }));
}

describe('OutlineRow — delete confirmation', () => {
  it('does not delete until the dialog is confirmed', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderRow({ onDelete });

    await chooseMenuItem(user, 'Welcome Document', /Delete/);

    expect(
      await screen.findByRole('alertdialog', { name: /Delete/ })
    ).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('deletes once the destructive action is chosen', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderRow({ onDelete });

    await chooseMenuItem(user, 'Welcome Document', /Delete/);
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledWith('n1');
  });

  it('names the exact number of documents the cascade takes with it', async () => {
    const user = userEvent.setup();
    renderRow({
      title: 'Chapter One',
      kind: 'folder',
      descendantCount: 2,
    });

    await chooseMenuItem(user, 'Chapter One', /Delete/);

    expect(
      await screen.findByText(/This also deletes 2 documents inside it/)
    ).toBeInTheDocument();
  });

  it('singularises a one-document subtree', async () => {
    const user = userEvent.setup();
    renderRow({ title: 'Chapter One', kind: 'folder', descendantCount: 1 });

    await chooseMenuItem(user, 'Chapter One', /Delete/);

    expect(
      await screen.findByText(/This also deletes 1 document inside it/)
    ).toBeInTheDocument();
  });

  it('says only that a leaf cannot be undone', async () => {
    const user = userEvent.setup();
    renderRow();

    await chooseMenuItem(user, 'Welcome Document', /Delete/);

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent("This can't be undone.");
    expect(dialog).not.toHaveTextContent(/also deletes/);
  });
});

describe('OutlineRow — status', () => {
  it('shows the status control on a document, not just on folders', () => {
    renderRow({ status: 'drafting' });

    expect(
      screen.getByRole('button', { name: 'Status: Drafting' })
    ).toBeInTheDocument();
  });

  it('shows it on a folder too', () => {
    renderRow({ title: 'Chapter One', kind: 'folder', status: 'done' });

    expect(
      screen.getByRole('button', { name: 'Status: Done' })
    ).toBeInTheDocument();
  });

  it('offers to set one when a document has no status yet', () => {
    renderRow();

    expect(
      screen.getByRole('button', { name: 'Set status' })
    ).toBeInTheDocument();
  });
});

describe('OutlineRow — add inside', () => {
  it('offers "New inside" on a document row, so a document can become a container', async () => {
    const user = userEvent.setup();
    const onAddChild = vi.fn();
    renderRow({ onAddChild });

    await user.click(
      screen.getByRole('button', { name: 'Actions for Welcome Document' })
    );
    // Driven by keyboard alone — the whole point of replacing hover-only icons.
    const sub = await screen.findByRole('menuitem', { name: 'New inside' });
    sub.focus();
    await user.keyboard('{ArrowRight}');
    await screen.findByRole('menuitem', { name: 'Document' });
    await user.keyboard('{Enter}');

    expect(onAddChild).toHaveBeenCalledWith('n1', 'document');
  });
});

describe('OutlineRow — inline rename', () => {
  it('keeps the row chrome while editing', async () => {
    const user = userEvent.setup();
    renderRow();

    expect(screen.getByText('43')).toBeInTheDocument();
    await chooseMenuItem(user, 'Welcome Document', 'Rename');

    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue(
      'Welcome Document'
    );
    // The count used to disappear with the rest of the row mid-edit.
    expect(screen.getByText('43')).toBeInTheDocument();
  });

  it('commits on Enter', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    renderRow({ onRename });

    await chooseMenuItem(user, 'Welcome Document', 'Rename');
    const input = await screen.findByRole('textbox', { name: 'Title' });
    await user.clear(input);
    await user.type(input, 'Prologue{Enter}');

    expect(onRename).toHaveBeenCalledWith('n1', 'Prologue');
  });

  it('reverts on Escape', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    renderRow({ onRename });

    await chooseMenuItem(user, 'Welcome Document', 'Rename');
    const input = await screen.findByRole('textbox', { name: 'Title' });
    await user.clear(input);
    await user.type(input, 'Prologue{Escape}');

    expect(onRename).not.toHaveBeenCalled();
    expect(await screen.findByText('Welcome Document')).toBeInTheDocument();
  });

  it('commits on blur and offers an undo', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    renderRow({ onRename });

    await chooseMenuItem(user, 'Welcome Document', 'Rename');
    const input = await screen.findByRole('textbox', { name: 'Title' });
    await user.clear(input);
    await user.type(input, 'Prologue');
    await user.tab();

    expect(onRename).toHaveBeenCalledWith('n1', 'Prologue');

    const undo = await screen.findByRole('button', { name: 'Undo' });
    await user.click(undo);

    await waitFor(() =>
      expect(onRename).toHaveBeenLastCalledWith('n1', 'Welcome Document')
    );
  });

  it('does not offer an undo when a blur changed nothing', async () => {
    const user = userEvent.setup();
    renderRow();

    await chooseMenuItem(user, 'Welcome Document', 'Rename');
    await screen.findByRole('textbox', { name: 'Title' });
    await user.tab();

    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Title' })).toBeNull()
    );
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });
});
