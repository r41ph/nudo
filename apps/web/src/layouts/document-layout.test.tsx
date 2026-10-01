import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'jotai';
import { renderWithProviders } from '@web/test/test-utils';
import { DocumentLayout } from '@web/layouts/document-layout';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import { currentDocumentAtom } from '@web/features/document/state/document.store';
import { lastSavedAtom } from '@web/shared/state/save-status.atom';
import {
  inspectorAtom,
  openInspectorAtom,
} from '@web/shared/state/panels.atom';
import type { DocumentDetails } from '@web/features/document/document.types';

const DETAILS: DocumentDetails = {
  id: 'd1',
  title: 'Welcome Document',
  kind: 'document',
  status: null,
  summary: '',
  pov: '',
  createdAt: '2026-09-01T09:00:00Z',
  updatedAt: '2026-09-06T10:25:00Z',
};

function renderLayout({
  focus = true,
  inspectorOpen = false,
}: { focus?: boolean; inspectorOpen?: boolean } = {}) {
  const store = createStore();
  store.set(isFocusModeAtom, focus);
  if (inspectorOpen) store.set(openInspectorAtom);
  store.set(lastSavedAtom, new Date('2026-09-06T10:25:00'));
  store.set(currentDocumentAtom, {
    id: 'd1',
    title: 'Welcome Document',
    content: [],
    wordCount: 412,
  });
  const view = renderWithProviders(
    <DocumentLayout details={DETAILS}>
      <p>editor</p>
    </DocumentLayout>,
    { store }
  );
  return Object.assign(store, { rerender: view.rerender });
}

const inspector = () =>
  screen.queryByRole('complementary', { name: 'Document details' });

describe('DocumentLayout — inspector', () => {
  it('renders nothing for the inspector until it is opened', () => {
    renderLayout({ focus: false });

    expect(inspector()).toBeNull();
  });

  it('shows the inspector beside the text, not over it', () => {
    renderLayout({ focus: false, inspectorOpen: true });

    expect(inspector()).toBeInTheDocument();
    expect(screen.getByText('editor')).toBeVisible();
    expect(inspector()?.contains(screen.getByText('editor'))).toBe(false);
  });

  it('hides it in focus mode but remembers it was open', () => {
    const store = renderLayout({ focus: true, inspectorOpen: true });

    expect(inspector()).toBeNull();
    expect(store.get(inspectorAtom).isOpen).toBe(true);
  });

  it('shows the new document in place after a switch', () => {
    const store = renderLayout({ focus: false, inspectorOpen: true });

    store.rerender(
      <DocumentLayout
        details={{ ...DETAILS, id: 'd2', updatedAt: '2026-09-07T08:00:00Z' }}
      >
        <p>editor</p>
      </DocumentLayout>
    );

    expect(inspector()).toBeInTheDocument();
    expect(
      screen.getByText('Updated').nextElementSibling?.querySelector('time')
    ).toHaveAttribute('dateTime', '2026-09-07T08:00:00Z');
  });
});

describe('DocumentLayout — word counts', () => {
  it('keeps the strip visible in focus mode', () => {
    renderLayout();

    expect(screen.getByText('document')).toHaveTextContent('412 document');
    expect(screen.getByText('today')).toBeInTheDocument();
    expect(screen.getByText('total')).toBeInTheDocument();
  });
});

describe('DocumentLayout — focus mode', () => {
  it('enters focus mode from the top bar button', async () => {
    const user = userEvent.setup();
    const store = renderLayout({ focus: false });

    await user.click(screen.getByRole('button', { name: 'Enter focus mode' }));

    expect(store.get(isFocusModeAtom)).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Leave focus mode' })
    ).toBeInTheDocument();
  });

  it('exits on Escape', async () => {
    const user = userEvent.setup();
    const store = renderLayout();

    await user.keyboard('{Escape}');

    expect(store.get(isFocusModeAtom)).toBe(false);
  });

  it('exits when the same button is clicked again', async () => {
    const user = userEvent.setup();
    const store = renderLayout();

    await user.click(screen.getByRole('button', { name: 'Leave focus mode' }));

    expect(store.get(isFocusModeAtom)).toBe(false);
    expect(
      screen.getByRole('button', { name: 'Enter focus mode' })
    ).toBeInTheDocument();
  });

  it('shows no breadcrumb, word count or timestamp in the bar', () => {
    renderLayout({ focus: false });

    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByText(/words/)).toBeNull();
    expect(screen.queryByText(/Last saved:/)).toBeNull();
  });

  it('does not listen for Escape outside focus mode', async () => {
    const user = userEvent.setup();
    const store = renderLayout({ focus: false });

    await user.keyboard('{Escape}');

    expect(store.get(isFocusModeAtom)).toBe(false);
  });
});
