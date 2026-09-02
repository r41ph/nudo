'use client';

import type * as React from 'react';

import { type TElement, KEYS } from 'platejs';
import { useEditorRef, useSelectionFragmentProp } from 'platejs/react';

import { getBlockType } from '@ui/components/editor/transforms';
import { ToolbarButton } from '@ui/components/ui/toolbar';

/**
 * Toolbar button for block-level transforms (paragraph, blockquote, …).
 *
 * Mirrors what `useMarkToolbarButton` gives mark buttons for free, which a bare
 * `ToolbarButton` does not:
 *  - `onMouseDown` preventDefault, so pressing the button never moves DOM focus
 *    out of the contenteditable (the floating toolbar hides as soon as the
 *    editor loses focus, and the caret would be lost).
 *  - `editor.tf.focus()` after the transform, so the user can keep typing.
 *  - a `pressed` state derived from the current selection, so the button
 *    reflects the block type the caret is actually in.
 */
export function BlockToolbarButton({
  nodeType,
  onTransform,
  ...props
}: Omit<React.ComponentProps<typeof ToolbarButton>, 'onClick' | 'pressed'> & {
  /** Block type this button represents, used to derive the pressed state. */
  nodeType: string;
  /**
   * Transform to run when the button is pressed. Callers close over their own
   * concrete editor instance, which carries the plugin transform types that the
   * generic `PlateEditor` here does not.
   */
  onTransform: () => void;
}) {
  const editor = useEditorRef();

  const blockType = useSelectionFragmentProp({
    defaultValue: KEYS.p,
    getProp: (node) => getBlockType(node as TElement),
  });

  return (
    <ToolbarButton
      {...props}
      pressed={blockType === nodeType}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        onTransform();
        editor.tf.focus();
      }}
    />
  );
}
