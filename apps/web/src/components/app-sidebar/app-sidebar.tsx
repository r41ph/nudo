import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PlusIcon, FileTextIcon } from 'lucide-react';
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
  SidebarMenuItem,
} from '@ui/components/ui/sidebar';
import { Button } from '@ui/components/ui/button';
import { GET_DOCUMENTS } from '@web/graphql/queries';
import { CREATE_DOCUMENT } from '@web/graphql/mutations';
import { graphqlClient } from '@web/lib/graphql-client';
import { queryClient } from '@web/lib/query-client';

export function AppSidebar() {
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['documents'],
    queryFn: () =>
      graphqlClient.request<{
        allDocuments: {
          nodes: Array<{ id: string; title: string; updatedAt: string }>;
        };
      }>(GET_DOCUMENTS),
  });

  const { mutate: createDocument, isPending } = useMutation({
    mutationFn: (variables: { title: string; content: unknown }) =>
      graphqlClient.request<{
        createNewDocument: { document: { id: string } };
      }>(CREATE_DOCUMENT, variables),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      navigate(`/document/${data.createNewDocument.document.id}`);
    },
  });

  const handleCreateDocument = () => {
    const defaultContent = [
      { type: 'p', children: [{ text: '' }] },
    ];
    createDocument({ title: 'Untitled Document', content: defaultContent });
  };

  const documents = data?.allDocuments?.nodes || [];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Button
          onClick={handleCreateDocument}
          disabled={isPending}
          className="w-full"
          size="sm"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Document
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {documents.map((doc) => (
                <SidebarMenuItem key={doc.id}>
                  <SidebarMenuButton
                    onClick={() => navigate(`/document/${doc.id}`)}
                  >
                    <FileTextIcon className="h-4 w-4" />
                    <span className="truncate">{doc.title}</span>
                  </SidebarMenuButton>
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
