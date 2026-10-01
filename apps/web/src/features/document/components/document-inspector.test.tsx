import { describe, it, expect, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MutableRefObject } from 'react';
import { DocumentInspector } from '@web/features/document/components/document-inspector';
import type { DocumentDetails } from '@web/features/document/document.types';
import {
  inspectorAtom,
  inspectorFocusRequestedAtom,
  openInspectorAtom,
} from '@web/shared/state/panels.atom';
import { renderWithProviders, createStore } from '@web/test/test-utils';

const DOC: DocumentDetails = {
  id: 'd1',
  title: 'The Arrival',
  kind: 'document',
  status: 'drafting',
  summary: '',
  pov: '',
  createdAt: '2025-09-12T10:24:00Z',
  updatedAt: '2025-09-15T14:03:00Z',
};

function setup({
  details = DOC,
  requestFocus = false,
}: { details?: DocumentDetails; requestFocus?: boolean } = {}) {
  const store = createStore();
  store.set(openInspectorAtom);
  if (!requestFocus) store.set(inspectorFocusRequestedAtom, false);

  const returnFocusRef: MutableRefObject<HTMLElement | null> = {
    current: null,
  };

  // autoFocus: focus is on the row menu before the panel mounts, as it is
  // after the menu closes in the app.
  renderWithProviders(
    <>
      <button type="button" autoFocus>
        Actions for The Arrival
      </button>
      <div data-slate-editor="true" contentEditable tabIndex={-1}>
        editor
      </div>
      <DocumentInspector details={details} returnFocusRef={returnFocusRef} />
    </>,
    { store }
  );
  return { store, returnFocusRef };
}

const trigger = () =>
  screen.getByRole('button', { name: 'Actions for The Arrival' });

describe('DocumentInspector — tabs', () => {
  it('opens on Details with Notes visible but disabled', () => {
    setup();

    expect(screen.getByRole('tab', { name: 'Details' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'Notes' })).toBeDisabled();
  });

  it('shows read-only Created and Updated timestamps', () => {
    setup();

    const created = screen.getByText('Created').nextElementSibling;
    const updated = screen.getByText('Updated').nextElementSibling;
    expect(created?.querySelector('time')).toHaveAttribute(
      'dateTime',
      DOC.createdAt
    );
    expect(updated?.querySelector('time')).toHaveAttribute(
      'dateTime',
      DOC.updatedAt
    );
  });

  it('shows no word count', () => {
    setup();

    expect(screen.queryByText(/words?|document$/i)).toBeNull();
  });
});

describe('DocumentInspector — separators', () => {
  it('explains that separators have no details and offers only close', () => {
    setup({ details: { ...DOC, kind: 'separator', title: 'Part One' } });

    expect(
      screen.getByText("Separators don't have details.")
    ).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Close details' })
    ).toBeInTheDocument();
  });
});

describe('DocumentInspector — focus on open', () => {
  it('moves focus into the panel and remembers where it came from', () => {
    const store = createStore();
    store.set(openInspectorAtom);
    const returnFocusRef: MutableRefObject<HTMLElement | null> = {
      current: null,
    };
    renderWithProviders(
      <>
        <button type="button" autoFocus>
          Actions for The Arrival
        </button>
        <DocumentInspector details={DOC} returnFocusRef={returnFocusRef} />
      </>,
      { store }
    );

    expect(screen.getByRole('tab', { name: 'Details' })).toHaveFocus();
    expect(returnFocusRef.current).toBe(trigger());
    expect(store.get(inspectorFocusRequestedAtom)).toBe(false);
  });

  // A document switch remounts the panel with no request pending: the writer
  // just clicked the outline, so focus stays there.
  it('leaves focus alone when no open was requested', () => {
    setup();

    expect(trigger()).toHaveFocus();
  });

  it('refocuses when Details is chosen again while open', () => {
    const { store } = setup();
    trigger().focus();

    act(() => store.set(openInspectorAtom));

    expect(screen.getByRole('tab', { name: 'Details' })).toHaveFocus();
  });
});

describe('DocumentInspector — closing', () => {
  it('closes from the close button and returns focus to the row menu', async () => {
    const user = userEvent.setup();
    const { store, returnFocusRef } = setup();
    returnFocusRef.current = trigger();

    await user.click(screen.getByRole('button', { name: 'Close details' }));

    expect(store.get(inspectorAtom).isOpen).toBe(false);
    expect(trigger()).toHaveFocus();
  });

  it('closes on Escape without letting focus mode see it', async () => {
    const user = userEvent.setup();
    const { store } = setup();
    const seen = vi.fn();
    const onDocumentKeyDown = (e: KeyboardEvent) => seen(e.defaultPrevented);
    document.addEventListener('keydown', onDocumentKeyDown);

    screen.getByRole('tab', { name: 'Details' }).focus();
    await user.keyboard('{Escape}');

    document.removeEventListener('keydown', onDocumentKeyDown);
    expect(store.get(inspectorAtom).isOpen).toBe(false);
    expect(seen).toHaveBeenCalledWith(true);
  });

  it('ignores Escape pressed outside the panel', async () => {
    const user = userEvent.setup();
    const { store } = setup();
    trigger().focus();

    await user.keyboard('{Escape}');

    expect(store.get(inspectorAtom).isOpen).toBe(true);
  });

  it('falls back to the editor when the row menu is gone', async () => {
    const user = userEvent.setup();
    const { returnFocusRef } = setup();
    returnFocusRef.current = document.createElement('button'); // detached

    await user.click(screen.getByRole('button', { name: 'Close details' }));

    expect(screen.getByText('editor')).toHaveFocus();
  });
});
