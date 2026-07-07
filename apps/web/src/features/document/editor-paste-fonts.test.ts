import { describe, it, expect } from 'vitest';
import { createPlateEditor } from 'platejs/react';
import { BasicNodesKit } from '@ui/components/editor/plugins/basic-nodes-kit';
import { FontKit } from '@ui/components/editor/plugins/font-kit';

// The editor is composed in packages/ui (which has no test runner yet), so this
// regression test exercises the same plugin kits through apps/web's Vitest to
// prove that pasting HTML from outside the app never injects a foreign
// font-family mark — the app's own typography must win.
const deserialize = (html: string) => {
  const editor = createPlateEditor({ plugins: [...BasicNodesKit, ...FontKit] });
  return editor.api.html.deserialize({ element: html });
};

const firstLeaf = (html: string) => {
  const [block] = deserialize(html) as Array<{
    children: Array<Record<string, unknown>>;
  }>;
  return block.children[0];
};

describe('editor paste — external font handling', () => {
  it('strips font-family from pasted HTML so the app font is respected', () => {
    const leaf = firstLeaf(
      '<p><span style="font-family: Arial;">Hello</span></p>'
    );

    expect(leaf.text).toBe('Hello');
    expect(leaf).not.toHaveProperty('fontFamily');
  });

  it('strips font-family even when combined with other inline styles', () => {
    const leaf = firstLeaf(
      '<p><span style="font-family: \'Times New Roman\'; color: rgb(255, 0, 0);">Hi</span></p>'
    );

    expect(leaf).not.toHaveProperty('fontFamily');
  });

  it('preserves real formatting marks like bold on paste', () => {
    const leaf = firstLeaf('<p><strong>bold</strong></p>');

    expect(leaf.text).toBe('bold');
    expect(leaf.bold).toBe(true);
  });
});
