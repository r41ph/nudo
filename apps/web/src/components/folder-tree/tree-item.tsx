import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { FileTextIcon, PenIcon, Trash2Icon } from 'lucide-react';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from '@ui/components/ui/sidebar';
import { Input } from '@ui/components/ui/input';
import type { FolderTreeConfig } from './folder-tree.types';

interface TreeItemProps {
  domainId: string;
  title: string;
  isActive: boolean;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
  config?: FolderTreeConfig;
}

export const TreeItem = memo(function TreeItem({
  domainId,
  title,
  isActive,
  onRename,
  onDelete,
  onClick,
  config,
}: TreeItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
    setEditingTitle(title);
  }, [title]);

  const submitRename = useCallback(() => {
    if (editingTitle.trim()) {
      onRename(domainId, editingTitle.trim());
    }
    setIsEditing(false);
  }, [editingTitle, onRename, domainId]);

  const handleClick = useCallback(() => {
    onClick(domainId);
  }, [onClick, domainId]);

  const handleDelete = useCallback(() => {
    onDelete(domainId);
  }, [onDelete, domainId]);

  const ItemIcon = config?.itemIcon ?? FileTextIcon;

  return (
    <SidebarMenuItem>
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editingTitle}
          onChange={(e) => setEditingTitle(e.target.value)}
          onBlur={submitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitRename();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          className="h-7 text-sm"
        />
      ) : (
        <>
          <SidebarMenuButton isActive={isActive} onClick={handleClick}>
            <ItemIcon className="h-4 w-4" />
            <span className="truncate">{title}</span>
          </SidebarMenuButton>
          <SidebarMenuAction
            onClick={startEditing}
            showOnHover
            className="[&>svg]:size-3.5 right-6"
          >
            <PenIcon />
          </SidebarMenuAction>
          <SidebarMenuAction
            onClick={handleDelete}
            showOnHover
            className="[&>svg]:size-3.5"
          >
            <Trash2Icon />
          </SidebarMenuAction>
        </>
      )}
    </SidebarMenuItem>
  );
});
