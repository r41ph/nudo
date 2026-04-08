import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { PenIcon, ChevronRightIcon, Trash2Icon } from 'lucide-react';
import { SidebarMenuItem, SidebarMenuButton } from '@ui/components/ui/sidebar';
import { Button } from '@ui/components/ui/button';
import { Input } from '@ui/components/ui/input';
import { cn } from '@ui/lib/utils';
import type { FolderTreeConfig } from '@web/features/folder/components/folder-tree.types';

interface FolderItemProps {
  domainId: string;
  name: string;
  isOpen: boolean;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  config?: FolderTreeConfig;
}

export const FolderItem = memo(function FolderItem({
  domainId,
  name,
  isOpen,
  onRename,
  onDelete,
  config,
}: FolderItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
    setEditingName(name);
  }, [name]);

  const submitRename = useCallback(() => {
    if (editingName.trim()) {
      onRename(domainId, editingName.trim());
    }
    setIsEditing(false);
  }, [editingName, onRename, domainId]);

  const handleDelete = useCallback(() => {
    onDelete(domainId);
  }, [onDelete, domainId]);

  return (
    <SidebarMenuItem>
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onBlur={submitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitRename();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          className="h-7 text-sm"
        />
      ) : (
        <div className="group/folder-row flex items-center">
          <SidebarMenuButton className="flex-1">
            <ChevronRightIcon
              className={cn(
                'h-4 w-4 shrink-0 transition-transform',
                isOpen && 'rotate-90',
              )}
            />
            <span className="truncate">{name}</span>
          </SidebarMenuButton>
          <div
            className="hidden shrink-0 items-center group-hover/folder-row:flex"
            onClick={(e) => e.stopPropagation()}
          >
            {config?.folderActions?.(domainId)}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={startEditing}
              className="h-5 w-5 [&_svg]:size-3.5"
            >
              <PenIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              className="h-5 w-5 [&_svg]:size-3.5"
            >
              <Trash2Icon />
            </Button>
          </div>
        </div>
      )}
    </SidebarMenuItem>
  );
});
