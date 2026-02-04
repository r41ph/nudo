import { PlateEditor } from '@ui/components/editor/plate-editor';
import type { ReactNode } from 'react';

export const MainEditor = ({
  handleEditToolbarDialog,
  enabledTools,
  isDialogOpen,
  children,
}: {
  handleEditToolbarDialog: () => void;
  enabledTools: string[];
  isDialogOpen?: boolean;
  children?: ReactNode;
}) => {
  return (
    <PlateEditor
      handleEditToolbarDialog={handleEditToolbarDialog}
      enabledTools={enabledTools}
      isDialogOpen={isDialogOpen}
    >
      {children}
    </PlateEditor>
  );
};
