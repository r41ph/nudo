import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@ui/components/ui/button';
import { Icon } from '@ui/components/icon/icon';
import { SidebarFooter } from '@ui/components/ui/sidebar';
import { useLogout } from '@web/features/auth/hooks/use-logout';
import { CREATE_NODE } from '@web/features/document/api/document.api';
import { AddNodeMenu } from '@web/features/outline/components/add-node-menu';
import type { NodeKind } from '@web/shared/types/outline.types';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { queryClient } from '@web/shared/lib/query-client';

const EMPTY_CONTENT = [{ type: 'p', children: [{ text: '' }] }];

const DEFAULT_TITLE: Record<NodeKind, string> = {
  document: 'Untitled',
  folder: 'Untitled Folder',
  separator: 'Part',
};

export function SidebarFooterActions() {
  const { logout } = useLogout();
  const navigate = useNavigate();

  const { mutate: addRootNode, isPending } = useMutation({
    mutationFn: (kind: NodeKind) =>
      graphqlClient.request<{ createNode: { document: { id: string } } }>(
        CREATE_NODE,
        {
          kind,
          parentId: null,
          title: DEFAULT_TITLE[kind],
          content: EMPTY_CONTENT,
        }
      ),
    onSuccess: (res, kind) => {
      queryClient.invalidateQueries({ queryKey: ['outline'] });
      if (kind !== 'separator') {
        navigate(`/document/${res.createNode.document.id}`);
      }
    },
  });

  const handleAdd = useCallback(
    (kind: NodeKind) => addRootNode(kind),
    [addRootNode]
  );

  return (
    <SidebarFooter className="p-4 gap-3">
      <AddNodeMenu
        onAdd={handleAdd}
        align="start"
        trigger={
          <Button
            variant="ghost"
            disabled={isPending}
            className="w-full justify-start gap-2 px-2 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-accent-foreground"
          >
            <Icon name="plus" className="h-4 w-4" />
            New
          </Button>
        }
      />
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={logout}
        >
          <Icon name="logOut" className="h-3.5 w-3.5" />
          Log out
        </Button>
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
