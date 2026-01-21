import { Layout } from '@web/components/layout/layout';
import { MainEditor } from '@writing-app/ui/src/components/main-editor/main-editor';
import { EditorToolbarDialog } from './components/toolbar-dialog/toolbar-dialog';
import { useAtomValue, useSetAtom } from 'jotai';
import { dialogAtom } from '@web/state/dialog.atom';
import { DIALOG_NAMES } from './constants/dialog.constants';
import { enabledToolsAtom } from '@web/state/toolbar.atom';

function App() {
  const setDialog = useSetAtom(dialogAtom);
  const enabledTools = useAtomValue(enabledToolsAtom);
  return (
    <div className="app">
      <Layout>
        <MainEditor
          handleEditToolbarDialog={() =>
            setDialog({
              activeDialog: DIALOG_NAMES.EDITOR_TOOLBAR,
            })
          }
          enabledTools={enabledTools}
        />
      </Layout>
      <EditorToolbarDialog />
    </div>
  );
}

export default App;
