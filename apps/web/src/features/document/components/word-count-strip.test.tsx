import { describe, it, expect, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { WordCountStrip } from '@web/features/document/components/word-count-strip';
import {
  currentDocumentAtom,
  liveWordCountAtom,
} from '@web/features/document/state/document.store';
import { MOCK_DOCUMENT } from '@web/test/mocks/fixtures';
import { renderWithProviders, createStore } from '@web/test/test-utils';

const today = (): string => new Date().toISOString().slice(0, 10);

function storeWithOpenDocument(liveCount: number) {
  const store = createStore();
  store.set(currentDocumentAtom, {
    id: MOCK_DOCUMENT.id,
    title: MOCK_DOCUMENT.title,
    content: [],
    wordCount: MOCK_DOCUMENT.wordCount,
  });
  store.set(liveWordCountAtom, {
    documentId: MOCK_DOCUMENT.id,
    count: liveCount,
  });
  return store;
}

afterEach(() => localStorage.clear());

describe('WordCountStrip', () => {
  it('labels all three counts', async () => {
    renderWithProviders(<WordCountStrip />);

    expect(await screen.findByText('total')).toHaveTextContent('0 total');
    expect(screen.getByText('document')).toHaveTextContent('0 document');
    expect(screen.getByText('today')).toHaveTextContent('0 today');
  });

  it('counts the open document live', async () => {
    renderWithProviders(<WordCountStrip />, {
      store: storeWithOpenDocument(13),
    });

    expect(await screen.findByText('document')).toHaveTextContent(
      '13 document'
    );
  });

  it("shows today's delta for the open document without a plus sign", async () => {
    localStorage.setItem(
      `nudo:word-baseline:${MOCK_DOCUMENT.id}:${today()}`,
      '1'
    );

    renderWithProviders(<WordCountStrip />, {
      store: storeWithOpenDocument(13),
    });

    expect(await screen.findByText('today')).toHaveTextContent('12 today');
    expect(screen.queryByText(/\+/)).toBeNull();
  });

  it('shows zeros when no document is open', () => {
    renderWithProviders(<WordCountStrip />);

    expect(screen.getByText('today')).toHaveTextContent('0 today');
    expect(screen.getByText('document')).toHaveTextContent('0 document');
  });

  it('groups thousands', async () => {
    renderWithProviders(<WordCountStrip />, {
      store: storeWithOpenDocument(1820),
    });

    expect(await screen.findByText('document')).toHaveTextContent(
      '1,820 document'
    );
  });
});
