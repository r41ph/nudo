import { PlateEditor } from '@ui/components/editor/plate-editor';

export const MainEditor = ({
  handleEditToolbarDialog,
  enabledTools,
}: {
  handleEditToolbarDialog: () => void;
  enabledTools: string[];
}) => {
  return (
    <PlateEditor
      handleEditToolbarDialog={handleEditToolbarDialog}
      enabledTools={enabledTools}
    />
  );
};
