import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  PlusIcon,
  PenIcon,
  ChevronRightIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  SidebarMenuItem,
  SidebarMenuButton,
} from '@ui/components/ui/sidebar';
import { Button } from '@ui/components/ui/button';
import { Input } from '@ui/components/ui/input';
import { cn } from '@ui/lib/utils';
import {
  CREATE_DOCUMENT,
  RENAME_FOLDER,
  DELETE_FOLDER,
} from '@web/graphql/mutations';
import { graphqlClient } from '@web/lib/graphql-client';
import { queryClient } from '@web/lib/query-client';
import type { FolderNode } from '@web/types/folder.types';

interface FolderItemProps {
  folder: FolderNode;
  isOpen: boolean;
  onToggle: () => void;
}

export function FolderItem({ folder, isOpen, onToggle }: FolderItemProps) {
  const navigate = useNavigate();
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [editingFolderName, setEditingFolderName] = useState('');
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingFolder && folderInputRef.current) {
      folderInputRef.current.focus();
      folderInputRef.current.select();
    }
  }, [isEditingFolder]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['folders'] });
  };

  const { mutate: renameFolder } = useMutation({
    mutationFn: (variables: { id: string; name: string }) =>
      graphqlClient.request(RENAME_FOLDER, variables),
    onSuccess: invalidate,
  });

  const { mutate: deleteFolder } = useMutation({
    mutationFn: (variables: { id: string }) =>
      graphqlClient.request(DELETE_FOLDER, variables),
    onSuccess: invalidate,
  });

  const { mutate: createDocument } = useMutation({
    mutationFn: (variables: {
      title: string;
      content: unknown;
      folderId: string;
    }) =>
      graphqlClient.request<{
        createNewDocument: { document: { id: string } };
      }>(CREATE_DOCUMENT, variables),
    onSuccess: (data) => {
      invalidate();
      navigate(`/document/${data.createNewDocument.document.id}`);
    },
  });

  const startEditingFolder = () => {
    setIsEditingFolder(true);
    setEditingFolderName(folder.name);
  };

  const submitFolderRename = () => {
    if (editingFolderName.trim()) {
      renameFolder({ id: folder.id, name: editingFolderName.trim() });
    }
    setIsEditingFolder(false);
  };

  const handleCreateDocument = () => {
    createDocument({
      title: 'Untitled Document',
      content: [{ type: 'p', children: [{ text: '' }] }],
      folderId: folder.id,
    });
  };

  return (
    <SidebarMenuItem>
      {isEditingFolder ? (
        <Input
          ref={folderInputRef}
          value={editingFolderName}
          onChange={(e) => setEditingFolderName(e.target.value)}
          onBlur={submitFolderRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitFolderRename();
            if (e.key === 'Escape') setIsEditingFolder(false);
          }}
          className="h-7 text-sm"
        />
      ) : (
        <div className="group/folder-row flex items-center">
          <SidebarMenuButton className="flex-1" onClick={onToggle}>
            <ChevronRightIcon
              className={cn(
                'h-4 w-4 shrink-0 transition-transform',
                isOpen && 'rotate-90'
              )}
            />
            <span className="truncate">{folder.name}</span>
          </SidebarMenuButton>
          <div className="hidden shrink-0 items-center group-hover/folder-row:flex">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCreateDocument}
              className="h-5 w-5 [&_svg]:size-3.5"
            >
              <PlusIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={startEditingFolder}
              className="h-5 w-5 [&_svg]:size-3.5"
            >
              <PenIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => deleteFolder({ id: folder.id })}
              className="h-5 w-5 [&_svg]:size-3.5"
            >
              <Trash2Icon />
            </Button>
          </div>
        </div>
      )}
    </SidebarMenuItem>
  );
}
