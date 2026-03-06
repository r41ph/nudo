import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { FileTextIcon, PenIcon, Trash2Icon } from 'lucide-react';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from '@ui/components/ui/sidebar';
import { Input } from '@ui/components/ui/input';
import type { TreeLeafItem, FolderTreeConfig } from './folder-tree.types';

interface TreeItemProps {
  item: TreeLeafItem;
  isActive: boolean;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onClick: (item: TreeLeafItem) => void;
  config?: FolderTreeConfig;
}

export const TreeItem = memo(function TreeItem({
  item,
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
    setEditingTitle(item.title);
  }, [item.title]);

  const submitRename = useCallback(() => {
    if (editingTitle.trim()) {
      onRename(item.id, editingTitle.trim());
    }
    setIsEditing(false);
  }, [editingTitle, onRename, item.id]);

  const handleClick = useCallback(() => {
    onClick(item);
  }, [onClick, item]);

  const handleDelete = useCallback(() => {
    onDelete(item.id);
  }, [onDelete, item.id]);

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
            <span className="truncate">{item.title}</span>
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
