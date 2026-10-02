import { useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { toast } from 'sonner';
import { Icon } from '@ui/components/icon/icon';
import { Button } from '@ui/components/ui/button';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@ui/components/ui/sidebar';
import {
  CREATE_NODE,
  RENAME_DOCUMENT,
  DELETE_DOCUMENT,
} from '@web/features/document/api/document.api';
import { GET_OUTLINE, SET_NODE_STATUS } from '@web/shared/api/outline.api';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { queryClient } from '@web/shared/lib/query-client';
import { openInspectorAtom } from '@web/shared/state/panels.atom';
import { useSidebarDnd } from '@web/features/sidebar/hooks/app-sidebar.hooks';
import {
  pickAdjacentDocumentId,
  pickDocumentAfterContainerDeletion,
} from '@web/features/sidebar/lib/pick-adjacent-document';
import { AddNodeMenu } from '@web/features/outline/components/add-node-menu';
import {
  OutlineTree,
  type OutlineTreeHandle,
} from '@web/features/outline/components/outline-tree';
import type { OutlineTreeCallbacks } from '@web/features/outline/components/outline-tree.types';
import type {
  NodeKind,
  NodeStatus,
  OutlineQueryData,
} from '@web/shared/types/outline.types';

const EMPTY_CONTENT = [{ type: 'p', children: [{ text: '' }] }];

const DEFAULT_TITLE: Record<NodeKind, string> = {
  document: 'Untitled',
  folder: 'Untitled Folder',
  separator: 'Part',
};

export function DraftSection() {
  const { id: activeDocId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const treeRef = useRef<OutlineTreeHandle>(null);
  const { moveNode } = useSidebarDnd();
  const openInspector = useSetAtom(openInspectorAtom);

  const { data } = useQuery({
    queryKey: ['outline'],
    queryFn: () => graphqlClient.request<OutlineQueryData>(GET_OUTLINE),
  });

  const nodes = useMemo(() => data?.allDocuments.nodes ?? [], [data]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['outline'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  }, []);

  // An open inspector shows this node's title and status from its own query.
  const invalidateWithDocument = useCallback(
    (_: unknown, { id }: { id: string }) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['document', id] });
    },
    [invalidate]
  );

  // Indexed once so collecting a subtree is O(n), not O(n²).
  const childrenByParent = useMemo(() => {
    const index = new Map<string, string[]>();
    for (const n of nodes) {
      if (n.parentId == null) continue;
      const siblings = index.get(n.parentId);
      if (siblings) siblings.push(n.id);
      else index.set(n.parentId, [n.id]);
    }
    return index;
  }, [nodes]);

  // `seen` keeps this terminating if the data ever contained a cycle.
  const subtreeIds = useCallback(
    (rootId: string) => {
      const out: string[] = [];
      const seen = new Set([rootId]);
      const stack = [rootId];
      while (stack.length) {
        const id = stack.pop() as string;
        out.push(id);
        for (const childId of childrenByParent.get(id) ?? []) {
          if (!seen.has(childId)) {
            seen.add(childId);
            stack.push(childId);
          }
        }
      }
      return out;
    },
    [childrenByParent]
  );

  const { mutate: renameNode } = useMutation({
    mutationFn: (v: { id: string; title: string }) =>
      graphqlClient.request(RENAME_DOCUMENT, v),
    onSuccess: invalidateWithDocument,
    onError: () =>
      toast.error('Could not rename — try again.', {
        id: 'outline-rename-error',
      }),
  });

  const { mutate: setStatus } = useMutation({
    mutationFn: (v: { id: string; status: NodeStatus | null }) =>
      graphqlClient.request(SET_NODE_STATUS, v),
    onSuccess: invalidateWithDocument,
    onError: () =>
      toast.error('Could not update status — try again.', {
        id: 'outline-status-error',
      }),
  });

  const { mutate: addChild } = useMutation({
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
    onSuccess: (res, v) => {
      invalidate();
      if (v.parentId) treeRef.current?.expandNode(v.parentId);
      if (v.kind !== 'separator') {
        navigate(`/document/${res.createNode.document.id}`);
      }
    },
    onError: () =>
      toast.error('Could not create — try again.', {
        id: 'outline-create-error',
      }),
  });

  const { mutate: deleteNode } = useMutation({
    mutationFn: (v: { id: string }) =>
      graphqlClient.request(DELETE_DOCUMENT, v),
    onSuccess: invalidate,
    onError: () =>
      toast.error('Could not delete — try again.', {
        id: 'outline-delete-error',
      }),
  });

  // Otherwise the editor keeps showing a dead document.
  const navigateAfterRemoval = useCallback(
    (removedIds: string[]) => {
      if (!activeDocId || !removedIds.includes(activeDocId)) return;
      const adjacency = nodes.map((n) => ({
        id: n.id,
        parentId: n.parentId,
        position: n.position,
      }));
      const nextId =
        removedIds.length === 1
          ? pickAdjacentDocumentId(adjacency, removedIds[0])
          : pickDocumentAfterContainerDeletion(adjacency, removedIds);
      queryClient.removeQueries({ queryKey: ['document', activeDocId] });
      navigate(nextId ? `/document/${nextId}` : '/');
    },
    [activeDocId, nodes, navigate]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const removed = subtreeIds(id);
      deleteNode({ id }, { onSuccess: () => navigateAfterRemoval(removed) });
    },
    [deleteNode, subtreeIds, navigateAfterRemoval]
  );

  const handleAddRoot = useCallback(
    (kind: NodeKind) => addChild({ kind, parentId: null }),
    [addChild]
  );

  const callbacks: OutlineTreeCallbacks = useMemo(
    () => ({
      onOpenNode: (id) => navigate(`/document/${id}`),
      onRenameNode: (id, title) => renameNode({ id, title }),
      onDeleteNode: handleDelete,
      onAddChild: (parentId, kind) => addChild({ kind, parentId }),
      onSetStatus: (id, status) => setStatus({ id, status }),
      // The inspector always shows the route's document, so another row's
      // details means opening that document first.
      onOpenDetails: (id) => {
        if (id !== activeDocId) navigate(`/document/${id}`);
        openInspector();
      },
      onMoveNode: (nodeId, targetParentId, positions) =>
        moveNode({ nodeId, targetParentId, nodePositions: positions }),
    }),
    [
      navigate,
      renameNode,
      handleDelete,
      addChild,
      setStatus,
      moveNode,
      activeDocId,
      openInspector,
    ]
  );

  return (
    <SidebarGroup className="p-0">
      {/* `--muted-foreground` rather than `--faint`: the latter fails the
          4.5:1 bar at this size. */}
      <SidebarGroupLabel className="mb-[13px] h-7 justify-between gap-2 pr-1.5 pl-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Draft
        <AddNodeMenu
          onAdd={handleAddRoot}
          align="end"
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Add to Draft"
              className="size-6.5 rounded-md text-muted-foreground hover:cursor-pointer hover:text-accent-foreground [&_svg]:size-3.5"
            >
              <Icon name="plus" />
            </Button>
          }
        />
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <OutlineTree
            ref={treeRef}
            nodes={nodes}
            callbacks={callbacks}
            activeItemId={activeDocId}
          />
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
