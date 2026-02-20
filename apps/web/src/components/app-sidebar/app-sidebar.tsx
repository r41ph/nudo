import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AddNewButton } from './add-new-button';
import { DocumentItem } from './document-item';
import { FolderItem } from './folder-item';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
} from '@ui/components/ui/sidebar';
import { GET_DOCUMENTS, GET_FOLDERS } from '@web/graphql/queries';
import {
  CREATE_DOCUMENT,
  RENAME_DOCUMENT,
  DELETE_DOCUMENT,
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

  const { mutate: deleteDocument } = useMutation({
    mutationFn: (variables: { id: string }) =>
      graphqlClient.request(DELETE_DOCUMENT, variables),
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

  const documents = docsData?.allDocuments?.nodes || [];
  const folders = foldersData?.allFolders?.nodes || [];
  const rootDocuments = documents.filter((doc) => !doc.folderId);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <AddNewButton
          disabled={isCreatingDoc}
          onNewDocument={() => handleCreateDocument()}
          onNewFolder={handleCreateFolder}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {folders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  isEditing={editingFolderId === folder.id}
                  editingName={editingFolderName}
                  editingDocId={editingDocId}
                  editingDocTitle={editingDocTitle}
                  onNameChange={setEditingFolderName}
                  onRenameSubmit={submitFolderRename}
                  onRenameCancel={() => setEditingFolderId(null)}
                  onStartEditing={() => startEditingFolder(folder)}
                  onCreateDocument={() => handleCreateDocument(folder.id)}
                  onDeleteFolder={() => deleteFolder({ id: folder.id })}
                  onDocTitleChange={setEditingDocTitle}
                  onDocRenameSubmit={submitDocRename}
                  onDocRenameCancel={() => setEditingDocId(null)}
                  onStartEditingDoc={startEditingDoc}
                  onDeleteDoc={(id) => deleteDocument({ id })}
                  onNavigateToDoc={(id) => navigate(`/document/${id}`)}
                />
              ))}
              {rootDocuments.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  doc={doc}
                  isEditing={editingDocId === doc.id}
                  editingTitle={editingDocTitle}
                  onTitleChange={setEditingDocTitle}
                  onRenameSubmit={submitDocRename}
                  onRenameCancel={() => setEditingDocId(null)}
                  onStartEditing={() => startEditingDoc(doc)}
                  onDelete={() => deleteDocument({ id: doc.id })}
                  onNavigate={() => navigate(`/document/${doc.id}`)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
