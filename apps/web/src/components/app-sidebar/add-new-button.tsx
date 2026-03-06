import { memo } from 'react';
import { PlusIcon, FileTextIcon, FolderIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import { Button } from '@ui/components/ui/button';

interface AddNewButtonProps {
  disabled?: boolean;
  onNewDocument: () => void;
  onNewFolder: () => void;
}

export const AddNewButton = memo(function AddNewButton({ disabled, onNewDocument, onNewFolder }: AddNewButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled} className="w-full" size="sm">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={onNewDocument}>
          <FileTextIcon className="h-4 w-4 mr-2" />
          New Document
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onNewFolder}>
          <FolderIcon className="h-4 w-4 mr-2" />
          New Folder
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
