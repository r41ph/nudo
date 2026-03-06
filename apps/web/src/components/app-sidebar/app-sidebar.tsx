import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AddNewButton } from './add-new-button';
import { ManuscriptsSection } from './sections/manuscripts-section';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@ui/components/ui/sidebar';
import { CREATE_DOCUMENT, CREATE_FOLDER } from '@web/graphql/mutations';
import { graphqlClient } from '@web/lib/graphql-client';
import { queryClient } from '@web/lib/query-client';

export function AppSidebar() {
  const navigate = useNavigate();

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
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      navigate(`/document/${data.createNewDocument.document.id}`);
    },
  });

  const { mutate: createFolder } = useMutation({
    mutationFn: (variables: { name: string }) =>
      graphqlClient.request(CREATE_FOLDER, variables),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });

  const handleCreateDocument = useCallback(() => {
    createDocument({
      title: 'Untitled Document',
      content: [{ type: 'p', children: [{ text: '' }] }],
    });
  }, [createDocument]);

  const handleCreateFolder = useCallback(() => {
    createFolder({ name: 'Untitled Folder' });
  }, [createFolder]);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <AddNewButton
          disabled={isCreatingDoc}
          onNewDocument={handleCreateDocument}
          onNewFolder={handleCreateFolder}
        />
      </SidebarHeader>
      <SidebarContent>
        <ManuscriptsSection />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
