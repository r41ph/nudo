import { describe, it, expect, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { WordCounts } from '@web/features/sidebar/components/word-counts';
import {
  currentDocumentAtom,
  liveWordCountAtom,
} from '@web/features/document/state/document.store';
import { MOCK_DOCUMENT } from '@web/test/mocks/fixtures';
import { renderWithProviders, createStore } from '@web/test/test-utils';

const today = (): string => new Date().toISOString().slice(0, 10);

afterEach(() => localStorage.clear());

describe('WordCounts', () => {
  it('shows the total across documents in sentence case', async () => {
    renderWithProviders(<WordCounts />);

    expect(await screen.findByText('4 Total words')).toBeInTheDocument();
  });

  it("shows today's delta for the open document without a plus sign", async () => {
    localStorage.setItem(
      `nudo:word-baseline:${MOCK_DOCUMENT.id}:${today()}`,
      '1'
    );
    const store = createStore();
    store.set(currentDocumentAtom, {
      id: MOCK_DOCUMENT.id,
      title: MOCK_DOCUMENT.title,
      content: [],
      wordCount: MOCK_DOCUMENT.wordCount,
    });
    store.set(liveWordCountAtom, { documentId: MOCK_DOCUMENT.id, count: 13 });

    renderWithProviders(<WordCounts />, { store });

    expect(await screen.findByText('12 Today words')).toBeInTheDocument();
    expect(screen.queryByText(/\+/)).toBeNull();
  });

  it('shows 0 Today when no document is open', () => {
    renderWithProviders(<WordCounts />);

    expect(screen.getByText('0 Today words')).toBeInTheDocument();
  });
});
