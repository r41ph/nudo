import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@ui/components/ui/button';
import { Icon } from '@ui/components/icon/icon';
import { SidebarFooter } from '@ui/components/ui/sidebar';
import { AddNewButton } from '@web/features/sidebar/components/add-new-button';
import { CREATE_DOCUMENT } from '@web/features/document/api/document.api';
import { CREATE_FOLDER } from '@web/features/folder/api/folder.api';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { queryClient } from '@web/shared/lib/query-client';

export function SidebarFooterActions() {
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
    <SidebarFooter className="p-4 gap-3">
      <AddNewButton
        disabled={isCreatingDoc}
        onNewDocument={handleCreateDocument}
        onNewFolder={handleCreateFolder}
      />
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Icon name="trash" className="h-3.5 w-3.5" />
          Trash
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Icon name="help" className="h-3.5 w-3.5" />
          Help
        </Button>
      </div>
    </SidebarFooter>
  );
}
