import { Button } from '@ui/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ui/components/ui/dialog';
import { DIALOG_NAMES } from '@web/constants/dialog.constants';
import { dialogAtom } from '@web/state/dialog.atom';
import { useAtom } from 'jotai';
import { enabledToolsAtom } from '@web/state/toolbar.atom';
import { TOOLBAR_TOOLS } from '@web/constants/toolbar.constants';
import { useMemo } from 'react';
import { ToolbarPreview } from './toolbar-preview';
import { ToolbarToolsList } from './toolbar-tools-list';

export function EditorToolbarDialog() {
  const [dialogState, setDialogState] = useAtom(dialogAtom);
  const isOpen = dialogState.activeDialog === DIALOG_NAMES.EDITOR_TOOLBAR;
  const [enabledTools, setEnabledTools] = useAtom(enabledToolsAtom);

  const tools = useMemo(() => {
    return Object.entries(TOOLBAR_TOOLS).map(([name, label]) => ({
      name,
      label,
      enabled: enabledTools.includes(name),
    }));
  }, [enabledTools]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setDialogState(() => ({
          activeDialog: open ? DIALOG_NAMES.EDITOR_TOOLBAR : null,
        }));
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-150 max-h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit editor toolbar tools</DialogTitle>
          <DialogDescription>
            Select all the tools you want to use in the editor toolbar.
          </DialogDescription>
        </DialogHeader>
        <ToolbarPreview enabledTools={enabledTools} />
        <ToolbarToolsList
          tools={tools}
          onToggleTool={(toolName, enabled) => {
            enabled
              ? setEnabledTools([...enabledTools, toolName])
              : setEnabledTools(enabledTools.filter((t) => t !== toolName));
          }}
        />
        {/* <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit">Save changes</Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}
