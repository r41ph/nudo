import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
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
          <>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton>
                <FolderIcon className="h-4 w-4" />
                <span className="truncate">{folder.name}</span>
                <ChevronRightIcon className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <SidebarMenuAction
              onClick={startEditingFolder}
              showOnHover
              className="[&>svg]:size-3.5 right-8"
            >
              <PenIcon />
            </SidebarMenuAction>
            <SidebarMenuAction
              onClick={handleCreateDocument}
              showOnHover
              className="[&>svg]:size-3.5 right-14"
            >
              <PlusIcon />
            </SidebarMenuAction>
            <SidebarMenuAction
              onClick={() => deleteFolder({ id: folder.id })}
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
                    onChange={(e) => setEditingDocTitle(e.target.value)}
                    onBlur={submitDocRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitDocRename();
                      if (e.key === 'Escape') setEditingDocId(null);
                    }}
                    className="h-7 text-sm"
                  />
                ) : (
                  <>
                    <SidebarMenuSubButton
                      onClick={() => navigate(`/document/${doc.id}`)}
                    >
                      <FileTextIcon className="h-4 w-4" />
                      <span className="truncate">{doc.title}</span>
                    </SidebarMenuSubButton>
                    <SidebarMenuAction
                      onClick={() => startEditingDoc(doc)}
                      showOnHover
                      className="[&>svg]:size-3.5 right-8"
                    >
                      <PenIcon />
                    </SidebarMenuAction>
                    <SidebarMenuAction
                      onClick={() => deleteDocument({ id: doc.id })}
                      showOnHover
                      className="[&>svg]:size-3.5"
                    >
                      <Trash2Icon />
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
