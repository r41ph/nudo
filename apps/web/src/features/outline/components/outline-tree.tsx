import {
  type Ref,
  type CSSProperties,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useTree } from '@headless-tree/react';
import {
  syncDataLoaderFeature,
  dragAndDropFeature,
  createOnDropHandler,
  type ItemInstance,
  type DragTarget,
} from '@headless-tree/core';
import { OutlineRow } from '@web/features/outline/components/outline-row';
import type {
  OutlineTreeData,
  TreeMap,
  OutlineTreeCallbacks,
} from '@web/features/outline/components/outline-tree.types';
import {
  buildTreeMap,
  countDescendants,
  createTreeStore,
} from '@web/features/outline/components/outline-tree.utils';
import type { OutlineNode } from '@web/shared/types/outline.types';

/** Ancestors of the active node, so we can auto-expand the path to it. */
function ancestorIds(
  nodes: OutlineNode[],
  activeId: string | undefined
): string[] {
  if (!activeId) return [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: string[] = [];
  let parent = byId.get(activeId)?.parentId ?? null;
  while (parent) {
    out.push(parent);
    parent = byId.get(parent)?.parentId ?? null;
  }
  return out;
}

/** True if `nodeId` lives somewhere inside `ancestorId`'s subtree. */
function isDescendant(
  map: TreeMap,
  ancestorId: string,
  nodeId: string
): boolean {
  const stack = [...(map[ancestorId]?.children ?? [])];
  while (stack.length) {
    const current = stack.pop() as string;
    if (current === nodeId) return true;
    stack.push(...(map[current]?.children ?? []));
  }
  return false;
}

/**
 * A node may drop into any node or the root — except into a separator (which
 * can't contain anything) or into itself / its own descendants (a cycle).
 */
function canDropInto(
  map: TreeMap,
  draggedId: string,
  targetId: string
): boolean {
  if (targetId === draggedId) return false;
  if (targetId === 'root') return true;
  const target = map[targetId]?.item;
  if (target?.type === 'node' && target.kind === 'separator') return false;
  return !isDescendant(map, draggedId, targetId);
}

/**
 * IDs hidden because a folded separator scopes them: every same-level sibling
 * after the separator until the next separator, plus their descendants.
 */
function hiddenByFolds(map: TreeMap, folded: ReadonlySet<string>): Set<string> {
  const hidden = new Set<string>();
  if (folded.size === 0) return hidden;

  const parentOf: Record<string, string> = {};
  for (const [pid, entry] of Object.entries(map)) {
    for (const childId of entry.children) parentOf[childId] = pid;
  }

  const isSeparator = (id: string) => {
    const item = map[id]?.item;
    return item?.type === 'node' && item.kind === 'separator';
  };

  for (const sepId of folded) {
    const parentId = parentOf[sepId];
    if (!parentId) continue;
    const siblings = map[parentId].children;
    const start = siblings.indexOf(sepId);
    for (let j = start + 1; j < siblings.length; j++) {
      if (isSeparator(siblings[j])) break;
      const stack = [siblings[j]];
      while (stack.length) {
        const x = stack.pop() as string;
        hidden.add(x);
        stack.push(...(map[x]?.children ?? []));
      }
    }
  }
  return hidden;
}

export interface OutlineTreeHandle {
  expandNode: (id: string) => void;
}

interface OutlineTreeProps {
  nodes: OutlineNode[];
  callbacks: OutlineTreeCallbacks;
  activeItemId?: string;
  ref?: Ref<OutlineTreeHandle>;
}

/**
 * One step per level. Sized so the group's guide line sits *outside* the
 * nested rows rather than through them: the line is under the parent
 * chevron's centre (a folder row's 14px gutter + half the 14px toggle cell = 21px),
 * and a nested row starts 4px clear to its right.
 */
const INDENT = 26;
/** How far left of a nested row's indent edge its group's guide line sits. */
const GUIDE_INSET = 5;

const itemStyleCache: Record<number, CSSProperties> = {};
const getItemStyle = (level: number): CSSProperties => {
  if (!itemStyleCache[level]) {
    itemStyleCache[level] = { paddingLeft: `${level * INDENT}px` };
  }
  return itemStyleCache[level];
};

const guideStyleCache: Record<number, CSSProperties> = {};
const getGuideStyle = (depth: number): CSSProperties => {
  if (!guideStyleCache[depth]) {
    guideStyleCache[depth] = {
      left: `${depth * INDENT - GUIDE_INSET}px`,
    };
  }
  return guideStyleCache[depth];
};

/**
 * The 1px rules that mark a nested group. Rows render flat (headless-tree gives
 * us a flat list, not nested DOM), so each row draws one segment per ancestor
 * level; stacked over adjacent rows they read as continuous lines that stop
 * after a group's last child.
 */
function IndentGuides({ level }: { level: number }) {
  if (level < 1) return null;
  return (
    <>
      {Array.from({ length: level }, (_, i) => (
        <span
          key={i}
          aria-hidden
          style={getGuideStyle(i + 1)}
          className="pointer-events-none absolute inset-y-0 w-px bg-sidebar-border"
        />
      ))}
    </>
  );
}

export function OutlineTree({
  nodes,
  callbacks,
  activeItemId,
  ref,
}: OutlineTreeProps) {
  const externalData = useMemo(() => buildTreeMap(nodes), [nodes]);

  const [store] = useState(() => createTreeStore(externalData));

  useEffect(() => {
    store.set(externalData);
  }, [externalData, store]);

  useSyncExternalStore(store.subscribe, store.getSnapshot);

  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Folded separators — client-side; folding hides the run after a separator.
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set());
  const toggleFold = useCallback((sepId: string) => {
    setFolded((prev) => {
      const next = new Set(prev);
      if (next.has(sepId)) next.delete(sepId);
      else next.add(sepId);
      return next;
    });
  }, []);

  // Drop fold ids whose separator no longer exists (after deletes/refetches) so
  // the set can't grow unbounded. Done during render — React's supported
  // "adjust state when a prop changes" pattern — to avoid a setState-in-effect.
  const [foldedFor, setFoldedFor] = useState(externalData);
  if (foldedFor !== externalData) {
    setFoldedFor(externalData);
    setFolded((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (externalData[id]) next.add(id);
        else changed = true;
      }
      return changed ? next : prev; // same ref ⇒ React bails out, no extra render
    });
  }

  const tree = useTree<OutlineTreeData>({
    rootItemId: 'root',
    dataLoader: {
      getItem: (id) =>
        store.getSnapshot()[id]?.item ?? ({ type: 'root' } as OutlineTreeData),
      getChildren: (id) => store.getSnapshot()[id]?.children ?? [],
    },
    // Separators can't contain anything; everything else is a drop container.
    isItemFolder: (item) => {
      const d = item.getItemData();
      return d.type !== 'node' || d.kind !== 'separator';
    },
    getItemName: (item) => {
      const d = item.getItemData();
      return d.type === 'node' ? d.title : '';
    },
    indent: INDENT,
    canReorder: true,
    draggedItemOverwritesSelection: true,
    canDrop: (
      items: ItemInstance<OutlineTreeData>[],
      target: DragTarget<OutlineTreeData>
    ) =>
      canDropInto(
        store.getSnapshot(),
        String(items[0]?.getId() ?? ''),
        String(target.item.getId())
      ),
    onDrop: async (
      items: ItemInstance<OutlineTreeData>[],
      target: DragTarget<OutlineTreeData>
    ) => {
      const draggedId = String(items[0].getId());
      const newParentId = String(target.item.getId());

      const applyDrop = createOnDropHandler<OutlineTreeData>(
        (item, newChildren) => {
          store.mutateChildren(String(item.getId()), newChildren);
        }
      );
      await applyDrop(items, target);

      const positions = (store.getSnapshot()[newParentId]?.children ?? []).map(
        (id, idx) => ({ id, position: idx })
      );
      callbacksRef.current.onMoveNode(
        draggedId,
        newParentId === 'root' ? null : newParentId,
        positions
      );
    },
    features: [syncDataLoaderFeature, dragAndDropFeature],
  });

  // Keep a live handle to the tree so the toggle callback below can stay stable
  // (referencing `tree` directly would make it change every render and defeat
  // OutlineRow's memo).
  const treeInstRef = useRef(tree);
  useEffect(() => {
    treeInstRef.current = tree;
  });

  // Stable per-row toggle: folds a separator, or expands/collapses anything else.
  const handleRowToggle = useCallback(
    (rowId: string, isSeparator: boolean) => {
      if (isSeparator) {
        toggleFold(rowId);
        return;
      }
      const inst = treeInstRef.current.getItemInstance(rowId);
      if (!inst) return;
      if (inst.isExpanded()) inst.collapse();
      else inst.expand();
    },
    [toggleFold]
  );

  useEffect(() => {
    tree.rebuildTree();
    for (const id of ancestorIds(nodes, activeItemId)) {
      tree.getItemInstance(id)?.expand();
    }
  }, [externalData, activeItemId]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    expandNode: (id: string) => tree.getItemInstance(id)?.expand(),
  }));

  // Re-renders are driven by the store subscription + `folded`, so a plain
  // recompute is correct and cheap at sidebar sizes.
  const snapshot = store.getSnapshot();
  const hidden = hiddenByFolds(snapshot, folded);

  // Only show the reorder indicator where the drop is actually allowed.
  const dragTarget = tree.getDragTarget();
  const draggedItems = tree.getState().dnd?.draggedItems;
  const showDragLine =
    !!dragTarget &&
    !!draggedItems?.length &&
    canDropInto(
      snapshot,
      String(draggedItems[0].getId()),
      String(dragTarget.item.getId())
    );

  return (
    <div {...tree.getContainerProps()} className="relative outline-none">
      {showDragLine && (
        <div
          style={tree.getDragLineStyle()}
          className="pointer-events-none absolute z-10 h-0.5 rounded-full bg-accent-foreground"
        />
      )}
      {tree.getItems().map((item) => {
        const data = item.getItemData();
        const id = String(item.getId());
        const level = item.getItemMeta().level;

        if (data.type !== 'node') return null;
        if (hidden.has(id)) return null;

        const isSeparator = data.kind === 'separator';

        return (
          <div
            key={id}
            {...item.getProps()}
            onClick={() =>
              isSeparator ? toggleFold(id) : callbacks.onOpenNode(id)
            }
            style={getItemStyle(level)}
            className="group/item relative outline-none"
          >
            <IndentGuides level={level} />
            <OutlineRow
              id={data.id}
              title={data.title}
              kind={data.kind}
              status={data.status}
              wordCount={data.wordCount}
              descendantCount={countDescendants(snapshot, id)}
              isOpen={isSeparator ? !folded.has(id) : item.isExpanded()}
              isActive={activeItemId === data.id}
              onRename={callbacks.onRenameNode}
              onDelete={callbacks.onDeleteNode}
              onAddChild={callbacks.onAddChild}
              onSetStatus={callbacks.onSetStatus}
              onToggle={handleRowToggle}
            />
          </div>
        );
      })}
    </div>
  );
}
