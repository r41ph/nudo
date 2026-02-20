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
import { CREATE_DOCUMENT, CREATE_FOLDER } from '@web/graphql/mutations';
import { graphqlClient } from '@web/lib/graphql-client';
import { queryClient } from '@web/lib/query-client';
import type { FolderNode } from '@web/types/folder.types';

export function AppSidebar() {
  const navigate = useNavigate();

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

  const { mutate: createFolder } = useMutation({
    mutationFn: (variables: { name: string }) =>
      graphqlClient.request(CREATE_FOLDER, variables),
    onSuccess: invalidateAll,
  });

  const handleCreateDocument = (folderId?: string) => {
    createDocument({
      title: 'Untitled Document',
      content: [{ type: 'p', children: [{ text: '' }] }],
      ...(folderId ? { folderId } : {}),
    });
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
          onNewFolder={() => createFolder({ name: 'Untitled Folder' })}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {folders.map((folder) => (
                <FolderItem key={folder.id} folder={folder} />
              ))}
              {rootDocuments.map((doc) => (
                <DocumentItem key={doc.id} doc={doc} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
