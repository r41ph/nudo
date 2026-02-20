import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  PlusIcon,
  FileTextIcon,
  PenIcon,
  FolderIcon,
  ChevronRightIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@ui/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ui/components/ui/collapsible';
import { Button } from '@ui/components/ui/button';
import { Input } from '@ui/components/ui/input';
import { GET_DOCUMENTS, GET_FOLDERS } from '@web/graphql/queries';
import {
  CREATE_DOCUMENT,
  RENAME_DOCUMENT,
  CREATE_FOLDER,
  RENAME_FOLDER,
  DELETE_FOLDER,
} from '@web/graphql/mutations';
import { graphqlClient } from '@web/lib/graphql-client';
import { queryClient } from '@web/lib/query-client';
import type { FolderNode } from '@web/types/folder.types';

export function AppSidebar() {
  const navigate = useNavigate();
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocTitle, setEditingDocTitle] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const docInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const { data: docsData } = useQuery({
    queryKey: ['documents'],
    queryFn: () =>
      graphqlClient.request<{
        allDocuments: {
          nodes: Array<{
            id: string;
            title: string;
            updatedAt: string;
            folderId: string | null;
          }>;
        };
      }>(GET_DOCUMENTS),
  });

  const { data: foldersData } = useQuery({
    queryKey: ['folders'],
    queryFn: () =>
      graphqlClient.request<{
        allFolders: { nodes: FolderNode[] };
      }>(GET_FOLDERS),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['folders'] });
  };

  const { mutate: createDocument, isPending: isCreatingDoc } = useMutation({
    mutationFn: (variables: {
      title: string;
      content: unknown;
      folderId?: string;
    }) =>
      graphqlClient.request<{
        createNewDocument: { document: { id: string } };
      }>(CREATE_DOCUMENT, variables),
    onSuccess: (data) => {
      invalidateAll();
      navigate(`/document/${data.createNewDocument.document.id}`);
    },
    onError: (e) => {
      console.error('Error creating document:', e);
      invalidateAll();
    },
  });

  const { mutate: renameDocument } = useMutation({
    mutationFn: (variables: { id: string; title: string }) =>
      graphqlClient.request(RENAME_DOCUMENT, variables),
    onSuccess: invalidateAll,
  });

  const { mutate: createFolder } = useMutation({
    mutationFn: (variables: { name: string }) =>
      graphqlClient.request(CREATE_FOLDER, variables),
    onSuccess: invalidateAll,
  });

  const { mutate: renameFolder } = useMutation({
    mutationFn: (variables: { id: string; name: string }) =>
      graphqlClient.request(RENAME_FOLDER, variables),
    onSuccess: invalidateAll,
  });

  const { mutate: deleteFolder } = useMutation({
    mutationFn: (variables: { id: string }) =>
      graphqlClient.request(DELETE_FOLDER, variables),
    onSuccess: invalidateAll,
  });

  const handleCreateDocument = (folderId?: string) => {
    const defaultContent = [{ type: 'p', children: [{ text: '' }] }];
    createDocument({
      title: 'Untitled Document',
      content: defaultContent,
      ...(folderId ? { folderId } : {}),
    });
  };

  const handleCreateFolder = () => {
    createFolder({ name: 'Untitled Folder' });
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

  const startEditingFolder = (folder: { id: string; name: string }) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const submitFolderRename = () => {
    if (editingFolderId && editingFolderName.trim()) {
      renameFolder({ id: editingFolderId, name: editingFolderName.trim() });
    }
    setEditingFolderId(null);
  };

  useEffect(() => {
    if (editingDocId && docInputRef.current) {
      docInputRef.current.focus();
      docInputRef.current.select();
    }
  }, [editingDocId]);

  useEffect(() => {
    if (editingFolderId && folderInputRef.current) {
      folderInputRef.current.focus();
      folderInputRef.current.select();
    }
  }, [editingFolderId]);

  const documents = docsData?.allDocuments?.nodes || [];
  const folders = foldersData?.allFolders?.nodes || [];
  const rootDocuments = documents.filter((doc) => !doc.folderId);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isCreatingDoc} className="w-full" size="sm">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => handleCreateDocument()}>
              <FileTextIcon className="h-4 w-4 mr-2" />
              New Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCreateFolder}>
              <FolderIcon className="h-4 w-4 mr-2" />
              New Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {folders.map((folder) => (
                <Collapsible key={folder.id} defaultOpen asChild>
                  <SidebarMenuItem>
                    {editingFolderId === folder.id ? (
                      <Input
                        ref={folderInputRef}
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onBlur={submitFolderRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitFolderRename();
                          if (e.key === 'Escape') setEditingFolderId(null);
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
                          onClick={() => startEditingFolder(folder)}
                          showOnHover
                          className="[&>svg]:size-3.5 right-8"
                        >
                          <PenIcon />
                        </SidebarMenuAction>
                        <SidebarMenuAction
                          onClick={() => handleCreateDocument(folder.id)}
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
                                onChange={(e) =>
                                  setEditingDocTitle(e.target.value)
                                }
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
                                  onClick={() =>
                                    navigate(`/document/${doc.id}`)
                                  }
                                >
                                  <FileTextIcon className="h-4 w-4" />
                                  <span className="truncate">{doc.title}</span>
                                </SidebarMenuSubButton>
                                <SidebarMenuAction
                                  onClick={() => startEditingDoc(doc)}
                                  showOnHover
                                  className="[&>svg]:size-3.5"
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
              ))}
              {rootDocuments.map((doc) => (
                <SidebarMenuItem key={doc.id}>
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
                      <SidebarMenuButton
                        onClick={() => navigate(`/document/${doc.id}`)}
                      >
                        <FileTextIcon className="h-4 w-4" />
                        <span className="truncate">{doc.title}</span>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        onClick={() => startEditingDoc(doc)}
                        showOnHover
                        className="[&>svg]:size-3.5"
                      >
                        <PenIcon />
                      </SidebarMenuAction>
                    </>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
