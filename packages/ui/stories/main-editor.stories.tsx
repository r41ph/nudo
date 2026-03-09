import { useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { normalizeNodeId } from 'platejs';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { MainEditor } from '@ui/components/main-editor/main-editor';
import { EditorToolbarDialog } from '@web/components/toolbar-dialog/toolbar-dialog';
import { TOOLBAR_TOOLS } from '@web/constants/toolbar.constants';
import { dialogAtom } from '@web/state/dialog.atom';
import { enabledToolsAtom } from '@web/state/toolbar.atom';
import { DIALOG } from '@web/constants/dialog.constants';

const ALL_TOOLS = Object.keys(TOOLBAR_TOOLS);

const storyContent = normalizeNodeId([
  {
    children: [{ text: 'MainEditor Story' }],
    type: 'h1',
  },
  {
    children: [
      {
        text: 'This is an interactive demo of the MainEditor component. Select any text to reveal the floating toolbar, then try out the formatting options.',
      },
    ],
    type: 'p',
  },
  {
    children: [
      {
        text: 'Use the controls panel below to toggle which tools appear in the toolbar. You can also click the settings icon on the right side of the toolbar to open the tool customisation dialog.',
      },
    ],
    type: 'p',
  },
]);

function MainEditorWithDialog({
  enabledTools: initialEnabledTools,
}: {
  enabledTools: string[];
}) {
  const [dialogState, setDialog] = useAtom(dialogAtom);
  const enabledTools = useAtomValue(enabledToolsAtom);
  const setEnabledTools = useSetAtom(enabledToolsAtom);
  const isDialogOpen = dialogState.activeDialog === DIALOG.EDITOR_TOOLBAR;

  // Sync story args into atom when they change
  useEffect(() => {
    setEnabledTools(initialEnabledTools);
  }, [initialEnabledTools, setEnabledTools]);

  return (
    <MainEditor
      enabledTools={enabledTools}
      isDialogOpen={isDialogOpen}
      handleEditToolbarDialog={() =>
        setDialog({ activeDialog: DIALOG.EDITOR_TOOLBAR })
      }
      initialContent={storyContent}
      onContentChange={() => {}}
    >
      <EditorToolbarDialog />
    </MainEditor>
  );
}

const meta: Meta<typeof MainEditor> = {
  title: 'MainEditor',
  component: MainEditor,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    enabledTools: ['bold', 'italic'],
  },
  argTypes: {
    enabledTools: {
      control: 'check',
      options: ALL_TOOLS,
    },
  },
  render: (args) => <MainEditorWithDialog enabledTools={args.enabledTools} />,
};

export default meta;
type Story = StoryObj<typeof MainEditor>;

export const Default: Story = {};

export const AllTools: Story = {
  args: {
    enabledTools: ALL_TOOLS,
  },
};
