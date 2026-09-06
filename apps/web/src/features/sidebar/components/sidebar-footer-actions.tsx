import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { Button } from '@ui/components/ui/button';
import { Icon } from '@ui/components/icon/icon';
import { Avatar, AvatarFallback } from '@ui/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import { SidebarFooter } from '@ui/components/ui/sidebar';
import { userAtom } from '@web/features/auth/state/auth.store';
import { useLogout } from '@web/features/auth/hooks/use-logout';
import { CREATE_NODE } from '@web/features/document/api/document.api';
import { GET_OUTLINE } from '@web/shared/api/outline.api';
import { pickCreateScope } from '@web/features/sidebar/lib/pick-create-scope';
import type {
  NodeKind,
  OutlineQueryData,
} from '@web/shared/types/outline.types';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { queryClient } from '@web/shared/lib/query-client';

const EMPTY_CONTENT = [{ type: 'p', children: [{ text: '' }] }];

const DEFAULT_TITLE: Record<NodeKind, string> = {
  document: 'Untitled',
  folder: 'Untitled Folder',
  separator: 'Part',
};

/** Two initials for the avatar, from the display name or the email. */
function initialsFor(displayName: string | null, email: string): string {
  const source = displayName?.trim() || email.split('@')[0];
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

/** Menu entries with nothing behind them yet — shown, but plainly unavailable. */
const UNWIRED = [
  { label: 'Settings', icon: 'settings' },
  { label: 'Trash', icon: 'trash' },
  { label: 'Help', icon: 'help' },
] as const;

export function SidebarFooterActions() {
  const { logout } = useLogout();
  const navigate = useNavigate();
  const { id: activeDocId } = useParams<{ id: string }>();
  const user = useAtomValue(userAtom);

  // Same query key as the outline tree, so this shares one cached fetch.
  const { data } = useQuery({
    queryKey: ['outline'],
    queryFn: () => graphqlClient.request<OutlineQueryData>(GET_OUTLINE),
  });

  const scope = useMemo(
    () => pickCreateScope(data?.allDocuments.nodes ?? [], activeDocId),
    [data, activeDocId]
  );

  const { mutate: createNode, isPending } = useMutation({
    mutationFn: (v: { kind: NodeKind; parentId: string | null }) =>
      graphqlClient.request<{ createNode: { document: { id: string } } }>(
        CREATE_NODE,
        {
          kind: v.kind,
          parentId: v.parentId,
          title: DEFAULT_TITLE[v.kind],
          content: EMPTY_CONTENT,
        }
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['outline'] });
      navigate(`/document/${res.createNode.document.id}`);
    },
    onError: () =>
      toast.error('Could not create — try again.', {
        id: 'footer-create-error',
      }),
  });

  // Inside a chapter the useful thing to add is a document; at the root it is
  // another chapter. The label says which, so the two entry points stop looking
  // identical while doing different things.
  const handleCreate = useCallback(
    () =>
      createNode(
        scope.parentId
          ? { kind: 'document', parentId: scope.parentId }
          : { kind: 'folder', parentId: null }
      ),
    [createNode, scope.parentId]
  );

  return (
    <SidebarFooter className="gap-2.5 p-3">
      <Button
        onClick={handleCreate}
        disabled={isPending}
        className="h-9 w-full justify-start gap-2.5 rounded-lg bg-sidebar-action px-3 text-[13.5px] font-semibold text-sidebar-action-foreground hover:cursor-pointer hover:bg-sidebar-action/90 [&_svg]:size-4"
      >
        <Icon name="plus" decorative />
        <span className="truncate">
          {scope.chapterTitle ? `New in ${scope.chapterTitle}` : 'New chapter'}
        </span>
      </Button>

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Account: ${user.email}`}
              className="flex items-center gap-2.5 rounded-lg px-1 py-0.5 hover:cursor-pointer hover:bg-row-hover"
            >
              <Avatar className="size-6.5">
                <AvatarFallback className="bg-border text-[11px] font-semibold text-prose">
                  {initialsFor(user.displayName, user.email)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-left text-[12.5px] text-foreground">
                {user.email}
              </span>
              <Icon
                name="chevronDown"
                decorative
                className="size-3.5 shrink-0 text-muted-foreground"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            className="w-52 rounded-lg p-[5px]"
          >
            {UNWIRED.map(({ label, icon }) => (
              <DropdownMenuItem
                key={label}
                disabled
                className="h-[30px] gap-[9px] rounded-md px-[9px] py-0 text-[12.5px] [&_svg]:size-3.5"
              >
                <Icon name={icon} decorative />
                {label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="mx-1.5 my-1" />
            <DropdownMenuItem
              onSelect={logout}
              className="h-[30px] gap-[9px] rounded-md px-[9px] py-0 text-[12.5px] [&_svg]:size-3.5"
            >
              <Icon name="logOut" decorative />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarFooter>
  );
}
