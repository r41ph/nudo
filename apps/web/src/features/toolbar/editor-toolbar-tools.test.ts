import { describe, it, expect } from 'vitest';
import { createPlateEditor } from 'platejs/react';
import type { Value } from 'platejs';
import { KEYS } from 'platejs';

import { AlignKit } from '@ui/components/editor/plugins/align-kit';
import { BasicNodesKit } from '@ui/components/editor/plugins/basic-nodes-kit';
import { FontKit } from '@ui/components/editor/plugins/font-kit';
import { setBlockType } from '@ui/components/editor/transforms';
import { stripUnknownMarks } from '@ui/components/editor/sanitize-content';
import { TOOLBAR_TOOLS } from '@web/features/toolbar/toolbar.constants';

// Lives here because packages/ui has no test runner. Exercises the production
// transforms each toolbar button invokes; also locks the Paragraph (¶) fix,
// which used to write a `pilcrow` mark no plugin registers.

type Leaf = Record<string, unknown> & { text: string };
type Block = { type: string; align?: string; children: Leaf[] };

const makeEditor = (value: Value) => {
  const editor = createPlateEditor({
    plugins: [...BasicNodesKit, ...AlignKit, ...FontKit],
    value,
  });
  // Transforms need a range, as when a user selects text before pressing a button.
  editor.tf.select({
    anchor: editor.api.start([])!,
    focus: editor.api.end([])!,
  });
  return editor;
};

type Editor = ReturnType<typeof makeEditor>;

const heading = (text = 'Chapter One'): Value => [
  { type: 'h1', children: [{ text }] },
];
const paragraph = (text = 'Chapter One'): Value => [
  { type: KEYS.p, children: [{ text }] },
];

const firstBlock = (editor: Editor) => editor.children[0] as unknown as Block;
const firstLeaf = (editor: Editor) => firstBlock(editor).children[0];

describe('editor toolbar tools', () => {
  describe('block-type tools', () => {
    it('Paragraph (¶) converts a heading back to body text', () => {
      const editor = makeEditor(heading());

      setBlockType(editor, KEYS.p);

      expect(firstBlock(editor).type).toBe(KEYS.p);
    });

    it('Paragraph (¶) converts a blockquote back to body text', () => {
      const editor = makeEditor([
        { type: KEYS.blockquote, children: [{ text: 'Quote' }] },
      ]);

      setBlockType(editor, KEYS.p);

      expect(firstBlock(editor).type).toBe(KEYS.p);
    });

    it('Paragraph (¶) never writes a `pilcrow` mark onto the text', () => {
      const editor = makeEditor(heading());

      setBlockType(editor, KEYS.p);

      expect(firstLeaf(editor)).not.toHaveProperty('pilcrow');
    });

    it('Paragraph (¶) converts every block in a multi-block selection', () => {
      const editor = makeEditor([
        { type: 'h1', children: [{ text: 'One' }] },
        { type: 'h2', children: [{ text: 'Two' }] },
      ]);

      setBlockType(editor, KEYS.p);

      expect(editor.children.map((n) => (n as unknown as Block).type)).toEqual([
        KEYS.p,
        KEYS.p,
      ]);
    });

    it('Headings turn a paragraph into h1/h2/h3', () => {
      for (const level of ['h1', 'h2', 'h3'] as const) {
        const editor = makeEditor(paragraph());
        setBlockType(editor, level);
        expect(firstBlock(editor).type).toBe(level);
      }
    });

    it('Blockquote toggles the block type', () => {
      const editor = makeEditor(paragraph());

      editor.tf.blockquote.toggle();
      expect(firstBlock(editor).type).toBe(KEYS.blockquote);

      editor.tf.blockquote.toggle();
      expect(firstBlock(editor).type).toBe(KEYS.p);
    });
  });

  describe('mark tools', () => {
    const markCases: Array<[string, (e: Editor) => void, string]> = [
      ['Bold', (e) => e.tf.bold.toggle(), KEYS.bold],
      ['Italic', (e) => e.tf.italic.toggle(), KEYS.italic],
      ['Underline', (e) => e.tf.underline.toggle(), KEYS.underline],
      ['Strikethrough', (e) => e.tf.strikethrough.toggle(), KEYS.strikethrough],
      ['Inline code', (e) => e.tf.code.toggle(), KEYS.code],
      ['Highlight', (e) => e.tf.highlight.toggle(), KEYS.highlight],
    ];

    it.each(markCases)(
      '%s toggles its leaf mark on and off',
      (_label, toggle, key) => {
        const editor = makeEditor(paragraph());

        toggle(editor);
        expect(firstLeaf(editor)[key]).toBe(true);

        toggle(editor);
        expect(firstLeaf(editor)[key]).toBeUndefined();
      }
    );
  });

  describe('style tools', () => {
    it('Font size adds a fontSize mark to the selection', () => {
      const editor = makeEditor(paragraph());

      editor.tf.fontSize.addMark('24px');

      expect(firstLeaf(editor)[KEYS.fontSize]).toBe('24px');
    });

    it('Font color adds a color mark to the selection', () => {
      const editor = makeEditor(paragraph());

      editor.tf.addMarks({ [KEYS.color]: '#D32F2F' });

      expect(firstLeaf(editor)[KEYS.color]).toBe('#D32F2F');
    });

    it('Text alignment sets the align prop on the block', () => {
      const editor = makeEditor(paragraph());

      editor.tf.textAlign.setNodes('center');

      expect(firstBlock(editor).align).toBe('center');
    });
  });

  describe('legacy content cleanup', () => {
    it('strips `pilcrow` marks the old Paragraph button wrote into saved content', () => {
      const value = [
        {
          type: KEYS.p,
          children: [{ text: 'Chapter One', pilcrow: true, bold: true }],
        },
      ];

      expect(stripUnknownMarks(value)).toEqual([
        { type: KEYS.p, children: [{ text: 'Chapter One', bold: true }] },
      ]);
    });

    it('strips `pilcrow` marks from nested children', () => {
      const value = [
        {
          type: KEYS.blockquote,
          children: [
            { type: KEYS.p, children: [{ text: 'Quote', pilcrow: true }] },
          ],
        },
      ];

      expect(stripUnknownMarks(value)).toEqual([
        {
          type: KEYS.blockquote,
          children: [{ type: KEYS.p, children: [{ text: 'Quote' }] }],
        },
      ]);
    });

    it('returns the original reference when there is nothing to strip', () => {
      const value = [{ type: KEYS.p, children: [{ text: 'Chapter One' }] }];

      // Same reference, or loading a clean document would mark it dirty.
      expect(stripUnknownMarks(value)).toBe(value);
    });
  });

  describe('tool labels', () => {
    it('labels the inline-code tool "Inline Code" under its legacy key', () => {
      // The key stays `codeBlock` so persisted toolbar settings keep resolving.
      expect(TOOLBAR_TOOLS.codeBlock).toBe('Inline Code');
    });
  });
});
