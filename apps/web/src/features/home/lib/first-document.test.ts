import { describe, expect, it } from 'vitest';
import {
  firstDocumentId,
  type HomeNode,
} from '@web/features/home/lib/first-document';

const node = (
  id: string,
  kind: HomeNode['kind'],
  position: number,
  parentId: string | null = null
): HomeNode => ({ id, kind, position, parentId });

describe('firstDocumentId', () => {
  it('opens the seeded document, not the folder that holds it at the same position', () => {
    expect(
      firstDocumentId([
        node('chapter', 'folder', 0),
        node('welcome', 'document', 0, 'chapter'),
      ])
    ).toBe('welcome');
  });

  it('follows outline order, not the order rows arrive in', () => {
    expect(
      firstDocumentId([
        node('later', 'document', 1),
        node('part', 'folder', 0),
        node('deep', 'document', 0, 'part'),
      ])
    ).toBe('deep');
  });

  it('skips separators', () => {
    expect(
      firstDocumentId([
        node('break', 'separator', 0),
        node('doc', 'document', 1),
      ])
    ).toBe('doc');
  });

  it('falls back to the first folder when there are no documents', () => {
    expect(
      firstDocumentId([
        node('break', 'separator', 0),
        node('folder', 'folder', 1),
      ])
    ).toBe('folder');
  });

  it('returns null for an empty outline', () => {
    expect(firstDocumentId([])).toBeNull();
  });
});
