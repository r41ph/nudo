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
  it('exits on Escape', async () => {
    const user = userEvent.setup();
    const store = renderLayout();

    await user.keyboard('{Escape}');

    expect(store.get(isFocusModeAtom)).toBe(false);
  });

  it('exits when the esc hint is clicked', async () => {
    const user = userEvent.setup();
    const store = renderLayout();

    await user.click(screen.getByRole('button', { name: 'Exit focus mode' }));

    expect(store.get(isFocusModeAtom)).toBe(false);
  });

  it('labels the exit affordance as the esc key', () => {
    renderLayout();

    expect(
      screen.getByRole('button', { name: 'Exit focus mode' })
    ).toHaveTextContent('esc');
  });

  it('keeps the word count and drops the timestamp', () => {
    renderLayout();

    expect(screen.getByText('412 words')).toBeInTheDocument();
    expect(screen.queryByText(/Last saved:/)).toBeNull();
  });

  it('does not listen for Escape outside focus mode', async () => {
    const user = userEvent.setup();
    const store = renderLayout({ focus: false });

    await user.keyboard('{Escape}');

    expect(store.get(isFocusModeAtom)).toBe(false);
    expect(
      screen.queryByRole('button', { name: 'Exit focus mode' })
    ).toBeNull();
  });
});
