import { describe, it, expect } from 'vitest';
import { extractPlainText } from './extractPlainText.js';

describe('extractPlainText', () => {
  it('returns an empty string for an empty array', () => {
    expect(extractPlainText([])).toBe('');
  });

  it('extracts text from a flat leaf node', () => {
    expect(extractPlainText([{ text: 'Hello' }])).toBe('Hello');
  });

  it('concatenates text from multiple sibling leaf nodes', () => {
    const nodes = [{ text: 'Hello' }, { text: 'world' }];
    expect(extractPlainText(nodes)).toBe('Hello world');
  });

  it('extracts text from nested children recursively', () => {
    const nodes = [
      {
        children: [
          { text: 'Nested' },
          { children: [{ text: 'deep' }] },
        ],
      },
    ];
    expect(extractPlainText(nodes)).toBe('Nested deep');
  });

  it('concatenates sibling paragraph nodes without inserting a separator', () => {
    // NOTE: spaces only appear between sibling *text leaf* nodes (each leaf appends " ").
    // Paragraph-level nodes rely on their children contributing trailing spaces; when a
    // paragraph has a single leaf, the inner call trims that space, so paragraphs run
    // together at the top level.
    const nodes = [
      { type: 'p', children: [{ text: 'First paragraph' }] },
      { type: 'p', children: [{ text: 'Second paragraph' }] },
    ];
    expect(extractPlainText(nodes)).toBe('First paragraphSecond paragraph');
  });

  it('handles mixed nodes with and without text', () => {
    const nodes = [
      { type: 'p', children: [{ text: 'Bold', bold: true }, { text: ' text' }] },
    ];
    expect(extractPlainText(nodes)).toBe('Bold  text');
  });

  it('returns an empty string for nodes with no text content', () => {
    const nodes = [{ type: 'image', url: 'img.png', children: [{ text: '' }] }];
    expect(extractPlainText(nodes)).toBe('');
  });

  it('trims leading and trailing whitespace from the result', () => {
    const nodes = [{ text: '  ' }, { text: 'clean' }, { text: '  ' }];
    // each leaf appends text + space; after trim the result should be clean
    expect(extractPlainText(nodes)).toBe('clean');
  });
});
