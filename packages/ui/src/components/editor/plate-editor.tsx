import type { Value } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';
import type { ReactNode } from 'react';

import { AlignKit } from '@ui/components/editor/plugins/align-kit';
import { FontKit } from '@ui/components/editor/plugins/font-kit';
import { AlignToolbarButton } from '@ui/components/ui/align-toolbar-button';
import { BasicNodesKit } from '@ui/components/editor/plugins/basic-nodes-kit';
import { SuggestionKit } from '@ui/components/editor/plugins/suggestion-kit';
import { CommentToolbarButton } from '@ui/components/ui/comment-toolbar-button';
import { Editor, EditorContainer } from '@ui/components/ui/editor';
import { FloatingToolbar } from '@ui/components/ui/floating-toolbar';
import { MarkToolbarButton } from '@ui/components/ui/mark-toolbar-button';
import { SuggestionToolbarButton } from '@ui/components/ui/suggestion-toolbar-button';
import { ToolbarButton, ToolbarGroup } from '@ui/components/ui/toolbar';
import {
  BoldIcon,
  ItalicIcon,
  Quote,
  StrikethroughIcon,
  PilcrowIcon,
  UnderlineIcon,
  CodeIcon,
  HighlighterIcon,
  BaselineIcon,
  Settings2Icon,
} from 'lucide-react';
// import { FixedToolbar } from '../ui/fixed-toolbar';
import { TurnIntoToolbarButton } from '@ui/components/ui/turn-into-toolbar-button';
import { FontSizeToolbarButton } from '@ui/components/editor/font-size-toolbar-button';
import { FontColorToolbarButton } from '@ui/components/editor/font-color-toolbar-button';
import { ToolbarCustomButton } from '../toolbar-custom-button/toolbar-custom-button';

export function PlateEditor({
  handleEditToolbarDialog,
  enabledTools,
  isDialogOpen,
  initialContent,
  onContentChange,
  children,
}: {
  handleEditToolbarDialog: () => void;
  enabledTools: string[];
  isDialogOpen?: boolean;
  initialContent?: unknown[];
  onContentChange?: (content: unknown[]) => void;
  children?: ReactNode;
}) {
  const editor = usePlateEditor({
    plugins: [...BasicNodesKit, ...SuggestionKit, ...AlignKit, ...FontKit],
    value: initialContent && initialContent.length > 0
      ? (initialContent as Value)
      : undefined,
  });

  const isEnabled = (tool: string) => enabledTools.includes(tool);

  return (
    <div className="border border-gray-300 shadow-lg">
      <Plate
        editor={editor}
        onChange={({ value }) => {
          onContentChange?.(value);
        }}
      >
        <FloatingToolbar
          // placement="bottom"
          className="border-b border-gray-300 px-2"
          state={{
            isDialogOpen: !!isDialogOpen,
          }}
        >
          {/* Toolbar tools */}
          <ToolbarGroup>
            {isEnabled('fontSize') && <FontSizeToolbarButton />}
            {isEnabled('paragraph') && (
              <MarkToolbarButton nodeType="pilcrow" tooltip="Text (Ctrl+Alt+0)">
                <PilcrowIcon />
              </MarkToolbarButton>
            )}
            {isEnabled('bold') && (
              <MarkToolbarButton nodeType="bold" tooltip="Bold (⌘+B)">
                <BoldIcon />
              </MarkToolbarButton>
            )}
            {isEnabled('italic') && (
              <MarkToolbarButton nodeType="italic" tooltip="Italic (⌘+I)">
                <ItalicIcon />
              </MarkToolbarButton>
            )}
            {isEnabled('underline') && (
              <MarkToolbarButton nodeType="underline" tooltip="Underline (⌘+U)">
                <UnderlineIcon />
              </MarkToolbarButton>
            )}
            {isEnabled('strikethrough') && (
              <MarkToolbarButton
                nodeType="strikethrough"
                tooltip="Strikethrough (⌘+Shift+X)"
              >
                <StrikethroughIcon />
              </MarkToolbarButton>
            )}
            {isEnabled('blockquote') && (
              <ToolbarButton
                onClick={() => editor.tf.blockquote.toggle()}
                tooltip="Blockquote (⌘+Shift+>)"
              >
                <Quote />
              </ToolbarButton>
            )}
            {isEnabled('codeBlock') && (
              <ToolbarButton
                onClick={() => editor.tf.code.toggle()}
                tooltip="Code Block (Ctrl+E)"
              >
                <CodeIcon />
              </ToolbarButton>
            )}
            {isEnabled('highlightColor') && (
              <ToolbarButton
                onClick={() => editor.tf.highlight.toggle()}
                tooltip="Highlight (Ctrl+Shift+H)"
              >
                <HighlighterIcon />
              </ToolbarButton>
            )}
            {isEnabled('headings') && <TurnIntoToolbarButton />}
            {isEnabled('textAlignment') && <AlignToolbarButton />}
            {isEnabled('fontColor') && (
              <FontColorToolbarButton nodeType="color" tooltip="Font Color">
                <BaselineIcon />
              </FontColorToolbarButton>
            )}
            {isEnabled('comments') && <CommentToolbarButton />}
            {isEnabled('suggestions') && <SuggestionToolbarButton />}
          </ToolbarGroup>
          {/* Toolbar edit */}
          <ToolbarGroup>
            <ToolbarCustomButton
              icon={Settings2Icon}
              tooltip="Edit Toolbar"
              onClick={handleEditToolbarDialog}
            />
          </ToolbarGroup>
        </FloatingToolbar>

        {/* TO-DO: <FixedToolbar className="border-b border-gray-300 px-2"></FixedToolbar> */}

        <EditorContainer variant="default">
          <Editor variant="default" placeholder="Type..." />
        </EditorContainer>
        {children}
      </Plate>
    </div>
  );
}

