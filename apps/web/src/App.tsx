import { Layout } from '@web/components/layout/layout';
import { MainEditor } from '@writing-app/ui/src/components/main-editor/main-editor';
import { EditorToolbarDialog } from './components/toolbar-dialog/toolbar-dialog';
import { useAtom, useAtomValue } from 'jotai';
import { dialogAtom } from '@web/state/dialog.atom';
import { DIALOG } from './constants/dialog.constants';
import { enabledToolsAtom } from '@web/state/toolbar.atom';

function App() {
  const [dialogState, setDialog] = useAtom(dialogAtom);
  const enabledTools = useAtomValue(enabledToolsAtom);
  const isDialogOpen = dialogState.activeDialog === DIALOG.EDITOR_TOOLBAR;

  return (
    <div className="app">
      <Layout>
        <MainEditor
          handleEditToolbarDialog={() => {
            setDialog({
              activeDialog: DIALOG.EDITOR_TOOLBAR,
            });
          }}
          enabledTools={enabledTools}
          isDialogOpen={isDialogOpen}
        >
          <EditorToolbarDialog />
        </MainEditor>
      </Layout>
    </div>
  );
}

export default App;
