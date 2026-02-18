import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PlusIcon, FileTextIcon, PenIcon } from 'lucide-react';
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
} from '@ui/components/ui/sidebar';
import { Button } from '@ui/components/ui/button';
import { Input } from '@ui/components/ui/input';
import { GET_DOCUMENTS } from '@web/graphql/queries';
import { CREATE_DOCUMENT, RENAME_DOCUMENT } from '@web/graphql/mutations';
import { graphqlClient } from '@web/lib/graphql-client';
import { queryClient } from '@web/lib/query-client';

export function AppSidebar() {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  const { mutate: renameDocument } = useMutation({
    mutationFn: (variables: { id: string; title: string }) =>
      graphqlClient.request(RENAME_DOCUMENT, variables),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const handleCreateDocument = () => {
    const defaultContent = [{ type: 'p', children: [{ text: '' }] }];
    createDocument({ title: 'Untitled Document', content: defaultContent });
  };

  const startEditing = (doc: { id: string; title: string }) => {
    setEditingId(doc.id);
    setEditingTitle(doc.title);
  };

  const submitRename = () => {
    if (editingId && editingTitle.trim()) {
      renameDocument({ id: editingId, title: editingTitle.trim() });
    }
    setEditingId(null);
  };

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

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
                  {editingId === doc.id ? (
                    <Input
                      ref={inputRef}
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={submitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename();
                        if (e.key === 'Escape') setEditingId(null);
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
                        onClick={() => startEditing(doc)}
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
