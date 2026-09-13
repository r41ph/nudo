'use client';

import type * as React from 'react';

import { type TElement, KEYS } from 'platejs';
import { useEditorRef, useSelectionFragmentProp } from 'platejs/react';

import { getBlockType } from '@ui/components/editor/transforms';
import { ToolbarButton } from '@ui/components/ui/toolbar';

// Gives block transforms what `useMarkToolbarButton` gives marks for free: the
// mousedown is prevented so focus never leaves the contenteditable (the
// floating toolbar hides the moment it does), and focus is restored after the
// transform.
export function BlockToolbarButton({
  nodeType,
  onTransform,
  ...props
}: Omit<React.ComponentProps<typeof ToolbarButton>, 'onClick' | 'pressed'> & {
  nodeType: string;
  // Callers close over their own concrete editor: the generic `PlateEditor`
  // here lacks the plugin transform types.
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
