import { useRef, useEffect } from 'react';
import { FileTextIcon, PenIcon, Trash2Icon } from 'lucide-react';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from '@ui/components/ui/sidebar';
import { Input } from '@ui/components/ui/input';

interface DocumentItemProps {
  doc: { id: string; title: string };
  isEditing: boolean;
  editingTitle: string;
  onTitleChange: (title: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onStartEditing: () => void;
  onDelete: () => void;
  onNavigate: () => void;
}

export function DocumentItem({
  doc,
  isEditing,
  editingTitle,
  onTitleChange,
  onRenameSubmit,
  onRenameCancel,
  onStartEditing,
  onDelete,
  onNavigate,
}: DocumentItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <SidebarMenuItem>
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editingTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameSubmit();
            if (e.key === 'Escape') onRenameCancel();
          }}
          className="h-7 text-sm"
        />
      ) : (
        <>
          <SidebarMenuButton onClick={onNavigate}>
            <FileTextIcon className="h-4 w-4" />
            <span className="truncate">{doc.title}</span>
          </SidebarMenuButton>
          <SidebarMenuAction
            onClick={onDelete}
            showOnHover
            className="[&>svg]:size-3.5"
          >
            <Trash2Icon />
          </SidebarMenuAction>
          <SidebarMenuAction
            onClick={onStartEditing}
            showOnHover
            className="[&>svg]:size-3.5 right-8"
          >
            <PenIcon />
          </SidebarMenuAction>
        </>
      )}
    </SidebarMenuItem>
  );
}
