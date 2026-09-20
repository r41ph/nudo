import { KEYS, type Value } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';
import { type ReactNode, useEffect } from 'react';

import { AlignKit } from '@ui/components/editor/plugins/align-kit';
import type { DiscussionData } from '@ui/components/editor/plugins/discussion-kit.types';
import { FontKit } from '@ui/components/editor/plugins/font-kit';
import { AlignToolbarButton } from '@ui/components/ui/align-toolbar-button';
import { BasicNodesKit } from '@ui/components/editor/plugins/basic-nodes-kit';
import { SuggestionKit } from '@ui/components/editor/plugins/suggestion-kit';
import { CommentKit } from '@ui/components/editor/plugins/comment-kit';
import {
  DiscussionKit,
  discussionPlugin,
} from '@ui/components/editor/plugins/discussion-kit';
import { CommentToolbarButton } from '@ui/components/ui/comment-toolbar-button';
import type { ToolbarToolName } from '@web/features/toolbar/toolbar.types';
import { Editor, EditorContainer } from '@ui/components/ui/editor';
import { FloatingToolbar } from '@ui/components/ui/floating-toolbar';
import { MarkToolbarButton } from '@ui/components/ui/mark-toolbar-button';
import { SuggestionToolbarButton } from '@ui/components/ui/suggestion-toolbar-button';
import { ToolbarGroup } from '@ui/components/ui/toolbar';
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
import { TurnIntoToolbarButton } from '@ui/components/ui/turn-into-toolbar-button';
import { FontSizeToolbarButton } from '@ui/components/editor/font-size-toolbar-button';
import { FontColorToolbarButton } from '@ui/components/editor/font-color-toolbar-button';
import { setBlockType } from '@ui/components/editor/transforms';
import { BlockToolbarButton } from '@ui/components/editor/block-toolbar-button';
import { stripUnknownMarks } from '@ui/components/editor/sanitize-content';
import { ToolbarCustomButton } from '../toolbar-custom-button/toolbar-custom-button';

export function PlateEditor({
  handleEditToolbarDialog,
  enabledTools,
  isDialogOpen,
  initialContent,
  discussionData,
  onContentChange,
  onWordCountChange,
  children,
}: {
  handleEditToolbarDialog: () => void;
  enabledTools: ToolbarToolName[];
  isDialogOpen?: boolean;
  initialContent?: unknown[];
  discussionData?: DiscussionData;
  onContentChange?: (content: unknown[]) => void;
  onWordCountChange?: (count: number) => void;
  children?: ReactNode;
}) {
  const editor = usePlateEditor({
    plugins: [
      ...BasicNodesKit,
      ...CommentKit,
      ...DiscussionKit,
      ...SuggestionKit,
      ...AlignKit,
      ...FontKit,
    ],
    value:
      initialContent && initialContent.length > 0
        ? stripUnknownMarks(initialContent as Value)
        : undefined,
  });

  const isEnabled = (tool: ToolbarToolName) => enabledTools.includes(tool);

  useEffect(() => {
    if (!discussionData) return;
    editor.setOption(
      discussionPlugin,
      'currentUserId',
      discussionData.currentUserId
    );
    editor.setOption(
      discussionPlugin,
      'discussions',
      discussionData.discussions
    );
    editor.setOption(discussionPlugin, 'users', discussionData.users);
    editor.setOption(
      discussionPlugin,
      'onCreateDiscussion',
      discussionData.onCreateDiscussion
    );
    editor.setOption(
      discussionPlugin,
      'onEditComment',
      discussionData.onEditComment
    );
    editor.setOption(
      discussionPlugin,
      'onDeleteComment',
      discussionData.onDeleteComment
    );
    editor.setOption(discussionPlugin, 'onAddReply', discussionData.onAddReply);
    const getActiveCommentIds = () => {
      const nodes = editor.api.comment.nodes();
      return Array.from(
        new Set(
          nodes
            .map(([leaf]) => editor.api.comment.nodeId(leaf))
            .filter((id): id is string => !!id)
        )
      );
    };

    editor.setOption(
      discussionPlugin,
      'onDeleteDiscussion',
      async (id: string) => {
        await discussionData.onDeleteDiscussion?.(id);
        await discussionData.pruneOrphanedDiscussions?.(getActiveCommentIds());
      }
    );

    editor.setOption(
      discussionPlugin,
      'onResolveDiscussion',
      async (id: string) => {
        await discussionData.onResolveDiscussion?.(id);
        await discussionData.pruneOrphanedDiscussions?.(getActiveCommentIds());
      }
    );
  }, [editor, discussionData]);

  return (
    <Plate
      editor={editor}
      onValueChange={({ value }) => {
        onContentChange?.(value);
        if (onWordCountChange) {
          const trimmed = editor.api.string([]).trim();
          onWordCountChange(trimmed ? trimmed.split(/\s+/).length : 0);
        }
      }}
    >
      <FloatingToolbar
        className="border-b border-gray-300 px-2"
        state={{
          isDialogOpen: !!isDialogOpen,
        }}
      >
        <ToolbarGroup>
          {isEnabled('fontSize') && <FontSizeToolbarButton />}
          {isEnabled('paragraph') && (
            <BlockToolbarButton
              nodeType={KEYS.p}
              onTransform={() => setBlockType(editor, KEYS.p)}
              tooltip="Text (⌘+Alt+0)"
            >
              <PilcrowIcon />
            </BlockToolbarButton>
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
            <BlockToolbarButton
              nodeType={KEYS.blockquote}
              onTransform={() => editor.tf.blockquote.toggle()}
              tooltip="Blockquote (⌘+Shift+>)"
            >
              <Quote />
            </BlockToolbarButton>
          )}
          {/* Keyed `codeBlock` for backwards-compat with persisted toolbar
                settings, but this applies an inline code mark. */}
          {isEnabled('codeBlock') && (
            <MarkToolbarButton nodeType={KEYS.code} tooltip="Inline code (⌘+E)">
              <CodeIcon />
            </MarkToolbarButton>
          )}
          {isEnabled('highlightColor') && (
            <MarkToolbarButton
              nodeType={KEYS.highlight}
              tooltip="Highlight (⌘+Shift+H)"
            >
              <HighlighterIcon />
            </MarkToolbarButton>
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
        <ToolbarGroup>
          <ToolbarCustomButton
            icon={Settings2Icon}
            tooltip="Edit Toolbar"
            onClick={handleEditToolbarDialog}
          />
        </ToolbarGroup>
      </FloatingToolbar>

      <EditorContainer variant="default" className="leaf-prose">
        <Editor variant="none" className="pb-72" placeholder="Type..." />
      </EditorContainer>
      {children}
    </Plate>
  );
}
