import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ui/components/ui/dialog';
import { DIALOG } from '@web/constants/dialog.constants';
import { dialogAtom } from '@web/state/dialog.atom';
import { useAtom } from 'jotai';
import { enabledToolsAtom } from '@web/state/toolbar.atom';
import { TOOLBAR_TOOLS } from '@web/constants/toolbar.constants';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useEditorRef, useEditorSelector } from 'platejs/react';
import { ToolbarPreview } from './toolbar-preview';
import { ToolbarToolsList } from './toolbar-tools-list';

export function EditorToolbarDialog() {
  const [dialogState, setDialogState] = useAtom(dialogAtom);
  const isOpen = dialogState.activeDialog === DIALOG.EDITOR_TOOLBAR;
  const [enabledTools, setEnabledTools] = useAtom(enabledToolsAtom);
  const editor = useEditorRef();
  const savedSelection = useRef<typeof editor.selection>(null);

  // Continuously track the latest selection so we always have a valid one
  // saved before the dialog opens and focus leaves the editor
  const currentSelection = useEditorSelector((editor) => editor.selection, []);
  const latestSelectionRef = useRef(currentSelection);

  useEffect(() => {
    if (currentSelection) {
      latestSelectionRef.current = currentSelection;
    }
  }, [currentSelection]);

  const tools = useMemo(() => {
    return Object.entries(TOOLBAR_TOOLS).map(([name, label]) => ({
      name,
      label,
      enabled: enabledTools.includes(name),
    }));
  }, [enabledTools]);

  const toggleTool = useCallback(
    (toolName: string, enabled: boolean) => {
      setEnabledTools((prev) =>
        enabled ? [...prev, toolName] : prev.filter((t) => t !== toolName)
      );
    },
    [setEnabledTools]
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Save selection when opening/closing dialog — use the ref since
        // currentSelection may already be null by the time this fires
        if (latestSelectionRef.current) {
          savedSelection.current = latestSelectionRef.current;
        }
        setDialogState(() => ({
          activeDialog: open ? DIALOG.EDITOR_TOOLBAR : null,
        }));
      }}
    >
      <DialogContent
        className="ignore-click-outside/toolbar sm:max-w-150 max-h-[80vh] flex flex-col"
        overlayClassName="ignore-click-outside/toolbar"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          if (!savedSelection.current) return;
          const selection = savedSelection.current;
          const editorEl = editor.api.toDOMNode(editor);
          editorEl?.focus();
          // Collapse selection first to reset waitForCollapsedSelection flag
          editor.tf.select(selection.anchor);
          // Restore expanded selection after React processes the collapse
          setTimeout(() => {
            editor.tf.select(selection);
          }, 0);
        }}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Select Editor tools</DialogTitle>
          <DialogDescription>
            Select all the tools you want to use in the editor's toolbar.
          </DialogDescription>
        </DialogHeader>
        <ToolbarPreview enabledTools={enabledTools} />
        <ToolbarToolsList
          tools={tools}
          onToggleTool={toggleTool}
        />
      </DialogContent>
    </Dialog>
  );
}
