import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  PlusIcon,
  PenIcon,
  ChevronRightIcon,
  Trash2Icon,
  FileTextIcon,
} from 'lucide-react';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@ui/components/ui/sidebar';
import { Button } from '@ui/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ui/components/ui/collapsible';
import { Input } from '@ui/components/ui/input';
import {
  CREATE_DOCUMENT,
  RENAME_DOCUMENT,
  DELETE_DOCUMENT,
  RENAME_FOLDER,
  DELETE_FOLDER,
} from '@web/graphql/mutations';
import { graphqlClient } from '@web/lib/graphql-client';
import { queryClient } from '@web/lib/query-client';
import type { FolderNode } from '@web/types/folder.types';

interface FolderItemProps {
  folder: FolderNode;
}

export function FolderItem({ folder }: FolderItemProps) {
  const navigate = useNavigate();
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocTitle, setEditingDocTitle] = useState('');
  const folderInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingFolder && folderInputRef.current) {
      folderInputRef.current.focus();
      folderInputRef.current.select();
    }
  }, [isEditingFolder]);

  useEffect(() => {
    if (editingDocId && docInputRef.current) {
      docInputRef.current.focus();
      docInputRef.current.select();
    }
  }, [editingDocId]);

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

  const { mutate: renameDocument } = useMutation({
    mutationFn: (variables: { id: string; title: string }) =>
      graphqlClient.request(RENAME_DOCUMENT, variables),
    onSuccess: invalidate,
  });

  const { mutate: deleteDocument } = useMutation({
    mutationFn: (variables: { id: string }) =>
      graphqlClient.request(DELETE_DOCUMENT, variables),
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

  const startEditingDoc = (doc: { id: string; title: string }) => {
    setEditingDocId(doc.id);
    setEditingDocTitle(doc.title);
  };

  const submitDocRename = () => {
    if (editingDocId && editingDocTitle.trim()) {
      renameDocument({ id: editingDocId, title: editingDocTitle.trim() });
    }
    setEditingDocId(null);
  };

  const handleCreateDocument = () => {
    createDocument({
      title: 'Untitled Document',
      content: [{ type: 'p', children: [{ text: '' }] }],
      folderId: folder.id,
    });
  };

  return (
    <Collapsible defaultOpen asChild>
      <SidebarMenuItem className="group/collapsible">
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
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="flex-1">
                <ChevronRightIcon className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                <span className="truncate">{folder.name}</span>
              </SidebarMenuButton>
            </CollapsibleTrigger>
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
        <CollapsibleContent>
          <SidebarMenuSub className="mr-0 pr-0">
            {folder.documentsByFolderId.nodes.map((doc) => (
              <SidebarMenuSubItem key={doc.id} className="group/doc-row">
                {editingDocId === doc.id ? (
                  <Input
                    ref={docInputRef}
                    value={editingDocTitle}
                    onChange={(e) => setEditingDocTitle(e.target.value)}
                    onBlur={submitDocRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitDocRename();
                      if (e.key === 'Escape') setEditingDocId(null);
                    }}
                    className="h-7 text-sm"
                  />
                ) : (
                  <div className="flex w-full items-center">
                    <SidebarMenuSubButton
                      className="flex-1"
                      onClick={() => navigate(`/document/${doc.id}`)}
                    >
                      <FileTextIcon className="h-4 w-4" />
                      <span className="truncate">{doc.title}</span>
                    </SidebarMenuSubButton>
                    <div className="hidden shrink-0 items-center group-hover/doc-row:flex">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => startEditingDoc(doc)}
                        className="h-5 w-5 [&_svg]:size-3.5"
                      >
                        <PenIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteDocument({ id: doc.id })}
                        className="h-5 w-5 [&_svg]:size-3.5"
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </div>
                )}
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
