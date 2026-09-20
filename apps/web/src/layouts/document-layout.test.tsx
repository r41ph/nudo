import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'jotai';
import { renderWithProviders } from '@web/test/test-utils';
import { DocumentLayout } from '@web/layouts/document-layout';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import { currentDocumentAtom } from '@web/features/document/state/document.store';
import { lastSavedAtom } from '@web/shared/state/save-status.atom';

function renderLayout({ focus = true }: { focus?: boolean } = {}) {
  const store = createStore();
  store.set(isFocusModeAtom, focus);
  store.set(lastSavedAtom, new Date('2026-09-06T10:25:00'));
  store.set(currentDocumentAtom, {
    id: 'd1',
    title: 'Welcome Document',
    content: [],
    wordCount: 412,
  });
  renderWithProviders(
    <DocumentLayout>
      <p>editor</p>
    </DocumentLayout>,
    { store }
  );
  return store;
}

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
