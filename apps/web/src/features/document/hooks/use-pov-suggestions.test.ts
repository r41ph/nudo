import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import {
  povSuggestions,
  usePovSuggestions,
} from '@web/features/document/hooks/use-pov-suggestions';
import type { OutlineNode } from '@web/shared/types/outline.types';
import { server } from '@web/test/mocks/server';
import { renderHookWithProviders } from '@web/test/test-utils';

let seq = 0;
const node = (pov: string): OutlineNode => ({
  id: `n${++seq}`,
  title: 'Scene',
  parentId: null,
  position: seq,
  kind: 'document',
  status: null,
  wordCount: 0,
  pov,
});

describe('povSuggestions', () => {
  it('returns nothing when no document has a POV', () => {
    expect(povSuggestions([node(''), node('')], 50)).toEqual([]);
  });

  it('ignores blank and whitespace-only values', () => {
    expect(povSuggestions([node('  '), node('Mara')], 50)).toEqual(['Mara']);
  });

  it('trims what it offers', () => {
    expect(povSuggestions([node('  Mara ')], 50)).toEqual(['Mara']);
  });

  // The point of the list: stop "Mara" / "mara" drifting apart.
  it('merges spellings that differ only in case, keeping the most used', () => {
    const nodes = [node('mara'), node('Mara'), node('Mara'), node('MARA')];

    expect(povSuggestions(nodes, 50)).toEqual(['Mara']);
  });

  it('keeps the first-seen spelling when spellings are tied', () => {
    expect(povSuggestions([node('mara'), node('Mara')], 50)).toEqual(['mara']);
  });

  it('orders by how often a POV is used, then alphabetically', () => {
    const nodes = [
      node('Teo'),
      node('Inès'),
      node('Mara'),
      node('Mara'),
      node('Mara'),
      node('Inès'),
      node('Abel'),
    ];

    expect(povSuggestions(nodes, 50)).toEqual(['Mara', 'Inès', 'Abel', 'Teo']);
  });

  it('caps the list', () => {
    const nodes = Array.from({ length: 60 }, (_, i) => node(`POV ${i}`));

    expect(povSuggestions(nodes, 50)).toHaveLength(50);
  });
});

describe('usePovSuggestions', () => {
  it('derives suggestions from the outline query', async () => {
    server.use(
      graphql.query('GetOutline', () =>
        HttpResponse.json({
          data: {
            allDocuments: {
              nodes: [node('Mara'), node('Teo'), node('Mara'), node('')],
            },
          },
        })
      )
    );

    const { result } = renderHookWithProviders(() => usePovSuggestions());

    expect(result.current).toEqual([]);
    await waitFor(() => expect(result.current).toEqual(['Mara', 'Teo']));
  });
});
