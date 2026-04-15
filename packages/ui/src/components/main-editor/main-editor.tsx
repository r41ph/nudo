import { PlateEditor } from '@ui/components/editor/plate-editor';
import type { DiscussionData } from '@ui/components/editor/plugins/discussion-kit.types';
import type { ReactNode } from 'react';
import type { ToolbarToolName } from '@web/features/toolbar/toolbar.types';

export const MainEditor = ({
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
}) => {
  return (
    <PlateEditor
      handleEditToolbarDialog={handleEditToolbarDialog}
      enabledTools={enabledTools}
      isDialogOpen={isDialogOpen}
      initialContent={initialContent}
      discussionData={discussionData}
      onContentChange={onContentChange}
      onWordCountChange={onWordCountChange}
    >
      {children}
    </PlateEditor>
  );
};
