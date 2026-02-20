import { useRef, useEffect } from 'react';
import {
  FolderIcon,
  PlusIcon,
  PenIcon,
  ChevronRightIcon,
  Trash2Icon,
  FileTextIcon,
} from 'lucide-react';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@ui/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ui/components/ui/collapsible';
import { Input } from '@ui/components/ui/input';
import type { FolderNode } from '@web/types/folder.types';

interface FolderItemProps {
  folder: FolderNode;
  isEditing: boolean;
  editingName: string;
  editingDocId: string | null;
  editingDocTitle: string;
  onNameChange: (name: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onStartEditing: () => void;
  onCreateDocument: () => void;
  onDeleteFolder: () => void;
  onDocTitleChange: (title: string) => void;
  onDocRenameSubmit: () => void;
  onDocRenameCancel: () => void;
  onStartEditingDoc: (doc: { id: string; title: string }) => void;
  onDeleteDoc: (id: string) => void;
  onNavigateToDoc: (id: string) => void;
}

export function FolderItem({
  folder,
  isEditing,
  editingName,
  editingDocId,
  editingDocTitle,
  onNameChange,
  onRenameSubmit,
  onRenameCancel,
  onStartEditing,
  onCreateDocument,
  onDeleteFolder,
  onDocTitleChange,
  onDocRenameSubmit,
  onDocRenameCancel,
  onStartEditingDoc,
  onDeleteDoc,
  onNavigateToDoc,
}: FolderItemProps) {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && folderInputRef.current) {
      folderInputRef.current.focus();
      folderInputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (editingDocId && docInputRef.current) {
      docInputRef.current.focus();
      docInputRef.current.select();
    }
  }, [editingDocId]);

  return (
    <Collapsible defaultOpen asChild>
      <SidebarMenuItem>
        {isEditing ? (
          <Input
            ref={folderInputRef}
            value={editingName}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameSubmit();
              if (e.key === 'Escape') onRenameCancel();
            }}
            className="h-7 text-sm"
          />
        ) : (
          <>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton>
                <FolderIcon className="h-4 w-4" />
                <span className="truncate">{folder.name}</span>
                <ChevronRightIcon className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <SidebarMenuAction
              onClick={onStartEditing}
              showOnHover
              className="[&>svg]:size-3.5 right-8"
            >
              <PenIcon />
            </SidebarMenuAction>
            <SidebarMenuAction
              onClick={onCreateDocument}
              showOnHover
              className="[&>svg]:size-3.5 right-14"
            >
              <PlusIcon />
            </SidebarMenuAction>
            <SidebarMenuAction
              onClick={onDeleteFolder}
              showOnHover
              className="[&>svg]:size-3.5"
            >
              <Trash2Icon />
            </SidebarMenuAction>
          </>
        )}
        <CollapsibleContent>
          <SidebarMenuSub>
            {folder.documentsByFolderId.nodes.map((doc) => (
              <SidebarMenuSubItem key={doc.id}>
                {editingDocId === doc.id ? (
                  <Input
                    ref={docInputRef}
                    value={editingDocTitle}
                    onChange={(e) => onDocTitleChange(e.target.value)}
                    onBlur={onDocRenameSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onDocRenameSubmit();
                      if (e.key === 'Escape') onDocRenameCancel();
                    }}
                    className="h-7 text-sm"
                  />
                ) : (
                  <>
                    <SidebarMenuSubButton onClick={() => onNavigateToDoc(doc.id)}>
                      <FileTextIcon className="h-4 w-4" />
                      <span className="truncate">{doc.title}</span>
                    </SidebarMenuSubButton>
                    <SidebarMenuAction
                      onClick={() => onDeleteDoc(doc.id)}
                      showOnHover
                      className="[&>svg]:size-3.5"
                    >
                      <Trash2Icon />
                    </SidebarMenuAction>
                    <SidebarMenuAction
                      onClick={() => onStartEditingDoc(doc)}
                      showOnHover
                      className="[&>svg]:size-3.5 right-8"
                    >
                      <PenIcon />
                    </SidebarMenuAction>
                  </>
                )}
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
