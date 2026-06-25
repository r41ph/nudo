import { useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Icon } from '@ui/components/icon/icon';
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
import {
  GET_OUTLINE,
  SET_NODE_STATUS,
} from '@web/features/outline/api/outline.api';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { queryClient } from '@web/shared/lib/query-client';
import { useSidebarDnd } from '@web/features/sidebar/hooks/app-sidebar.hooks';
import {
  pickAdjacentDocumentId,
  pickDocumentAfterContainerDeletion,
} from '@web/features/sidebar/lib/pick-adjacent-document';
import {
  OutlineTree,
  type OutlineTreeHandle,
} from '@web/features/outline/components/outline-tree';
import type { OutlineTreeCallbacks } from '@web/features/outline/components/outline-tree.types';
import type {
  NodeKind,
  NodeStatus,
  OutlineQueryData,
} from '@web/features/outline/outline.types';

const EMPTY_CONTENT = [{ type: 'p', children: [{ text: '' }] }];

const DEFAULT_TITLE: Record<NodeKind, string> = {
  document: 'Untitled',
  folder: 'Untitled Folder',
  separator: 'Part',
};

export function ManuscriptsSection() {
  const { id: activeDocId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const treeRef = useRef<OutlineTreeHandle>(null);
  const { moveNode } = useSidebarDnd();

  const { data } = useQuery({
    queryKey: ['outline'],
    queryFn: () => graphqlClient.request<OutlineQueryData>(GET_OUTLINE),
  });

  const nodes = useMemo(() => data?.allDocuments.nodes ?? [], [data]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['outline'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  }, []);

  // children-by-parent index, built once per node list, so collecting a subtree
  // is O(n) instead of rescanning every node per level (O(n²)).
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

  // All descendants of a node (inclusive), for delete adjacency / cascade. The
  // `seen` set keeps this terminating even if the data ever contained a cycle.
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

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: renameNode } = useMutation({
    mutationFn: (v: { id: string; title: string }) =>
      graphqlClient.request(RENAME_DOCUMENT, v),
    onSuccess: invalidate,
    onError: () =>
      toast.error('Could not rename — try again.', {
        id: 'outline-rename-error',
      }),
  });

  const { mutate: setStatus } = useMutation({
    mutationFn: (v: { id: string; status: NodeStatus | null }) =>
      graphqlClient.request(SET_NODE_STATUS, v),
    onSuccess: invalidate,
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
      // Separators have no editor surface — don't navigate into one.
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

  // Move the editor somewhere valid when the open node (or an ancestor of it)
  // is deleted — otherwise it keeps showing a dead document.
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

  const callbacks: OutlineTreeCallbacks = useMemo(
    () => ({
      onOpenNode: (id) => navigate(`/document/${id}`),
      onRenameNode: (id, title) => renameNode({ id, title }),
      onDeleteNode: handleDelete,
      onAddChild: (parentId, kind) => addChild({ kind, parentId }),
      onSetStatus: (id, status) => setStatus({ id, status }),
      onMoveNode: (nodeId, targetParentId, positions) =>
        moveNode({ nodeId, targetParentId, nodePositions: positions }),
    }),
    [navigate, renameNode, handleDelete, addChild, setStatus, moveNode]
  );

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-1.5 uppercase tracking-widest text-sm">
        <Icon name="bookOpen" className="h-3.5 w-3.5 shrink-0" />
        Story
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
