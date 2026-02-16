import { PlateEditor } from '@ui/components/editor/plate-editor';
import type { ReactNode } from 'react';

export const MainEditor = ({
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
}) => {
  return (
    <PlateEditor
      handleEditToolbarDialog={handleEditToolbarDialog}
      enabledTools={enabledTools}
      isDialogOpen={isDialogOpen}
      initialContent={initialContent}
      onContentChange={onContentChange}
    >
      {children}
    </PlateEditor>
  );
};
