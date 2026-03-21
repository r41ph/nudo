import { memo } from 'react';
import { Button } from '@ui/components/ui/button';
import { Icon } from '@ui/components/icon/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';

interface AddNewButtonProps {
  disabled?: boolean;
  onNewDocument: () => void;
  onNewFolder: () => void;
}

export const AddNewButton = memo(function AddNewButton({ disabled, onNewDocument, onNewFolder }: AddNewButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={disabled}
          className="w-full gap-2 bg-sidebar-action text-sidebar-action-foreground hover:bg-sidebar-action/90 hover:text-sidebar-action-foreground text-xs font-semibold uppercase tracking-widest"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          Add New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={onNewDocument}>
          <Icon name="fileText" className="h-4 w-4 mr-2" />
          New Document
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onNewFolder}>
          <Icon name="folder" className="h-4 w-4 mr-2" />
          New Folder
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
