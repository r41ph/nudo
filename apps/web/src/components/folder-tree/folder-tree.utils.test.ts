import { describe, it, expect } from 'vitest';
import { parseId, findContainer } from './folder-tree.utils';
import type { ItemsRecord } from './folder-tree.types';

describe('parseId', () => {
  it('parses a folder- prefixed id', () => {
    expect(parseId('folder-abc')).toEqual({ type: 'folder', id: 'abc' });
  });

  it('parses an item- prefixed id', () => {
    expect(parseId('item-123')).toEqual({ type: 'item', id: '123' });
  });

  it('returns null for an unprefixed id', () => {
    expect(parseId('unknown-456')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseId('')).toBeNull();
  });

  it('handles folder- prefix with complex id', () => {
    expect(parseId('folder-a1b2-c3d4')).toEqual({
      type: 'folder',
      id: 'a1b2-c3d4',
    });
  });
});

describe('findContainer', () => {
  const items: ItemsRecord = {
    root: ['item-1', 'item-2'],
    'folder-a': ['item-3', 'item-4'],
    'folder-b': [],
  };

  it('finds the container that holds an item', () => {
    expect(findContainer(items, 'item-3')).toBe('folder-a');
  });

  it('finds root container for root items', () => {
    expect(findContainer(items, 'item-1')).toBe('root');
  });

  it('returns the id itself if it is a container key', () => {
    expect(findContainer(items, 'folder-b')).toBe('folder-b');
  });

  it('returns undefined for an unknown id', () => {
    expect(findContainer(items, 'item-999')).toBeUndefined();
  });

  it('prefers the containing entry over the key match', () => {
    // If an id appears both as a container key and inside another container
    const overlapping: ItemsRecord = {
      root: ['folder-a'],
      'folder-a': ['item-1'],
    };
    expect(findContainer(overlapping, 'folder-a')).toBe('root');
  });
});
