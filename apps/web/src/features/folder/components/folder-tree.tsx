import {
  type Ref,
  type CSSProperties,
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
import { FolderItem } from '@web/features/folder/components/folder-item';
import { TreeItem } from '@web/features/folder/components/tree-item';
import type {
  FolderTreeData,
  TreeFolderItem,
  TreeLeafItem,
  FolderTreeCallbacks,
  FolderTreeConfig,
} from '@web/features/folder/components/folder-tree.types';
import {
  buildTreeMap,
  createTreeStore,
} from '@web/features/folder/components/folder-tree.utils';

function findParentFolderTreeId(
  folders: TreeFolderItem[],
  activeItemId: string | undefined
): string | null {
  if (!activeItemId) return null;
  const parent = folders.find((f) =>
    f.items.some((d) => d.id === activeItemId)
  );
  return parent ? `folder-${parent.id}` : null;
}

export interface FolderTreeHandle {
  expandFolder: (domainId: string) => void;
}

interface FolderTreeProps {
  folders: TreeFolderItem[];
  rootItems: TreeLeafItem[];
  callbacks: FolderTreeCallbacks;
  config?: FolderTreeConfig;
  activeItemId?: string;
  ref?: Ref<FolderTreeHandle>;
}

const INDENT = 20;

// Cache style objects by level so the same reference is reused across renders,
// allowing React to skip unnecessary DOM style reconciliation.
const itemStyleCache: Record<number, CSSProperties> = {};
const getItemStyle = (level: number): CSSProperties => {
  if (!itemStyleCache[level]) {
    itemStyleCache[level] = { paddingLeft: `${level * INDENT}px` };
  }
  return itemStyleCache[level];
};

export function FolderTree({
  folders,
  rootItems,
  callbacks,
  config,
  activeItemId,
  ref,
}: FolderTreeProps) {
  const externalData = useMemo(
    () => buildTreeMap(folders, rootItems),
    [folders, rootItems]
  );

  // External store holds the authoritative tree data. headless-tree's
  // createOnDropHandler invokes our onChangeChildren callback once per affected
  // parent within a single onDrop and then re-reads via getChildren — those
  // reads must see the post-mutation children, so the store is the source of
  // truth and the dataLoader reads getSnapshot() directly (not a closure).
  const [store] = useState(() => createTreeStore(externalData));

  // Sync server-driven changes into the store. Object.is guard inside store.set
  // prevents an unnecessary listener fan-out on mount.
  useEffect(() => {
    store.set(externalData);
  }, [externalData, store]);

  // Subscribe to store updates so the component re-renders on mutation.
  // The returned snapshot is intentionally unused — the dataLoader reads the
  // store directly so mid-drop mutations are visible to subsequent reads in
  // the same async onDrop call.
  useSyncExternalStore(store.subscribe, store.getSnapshot);

  // Keep latest callbacks accessible to the async onDrop without re-creating
  // useTree's options object every render.
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const tree = useTree<FolderTreeData>({
    rootItemId: 'root',
    dataLoader: {
      getItem: (id) =>
        store.getSnapshot()[id]?.item ?? ({ type: 'root' } as FolderTreeData),
      getChildren: (id) => store.getSnapshot()[id]?.children ?? [],
    },
    isItemFolder: (item) => item.getItemData().type !== 'document',
    getItemName: (item) => {
      const d = item.getItemData();
      if (d.type === 'folder') return d.name;
      if (d.type === 'document') return d.title;
      return '';
    },
    indent: INDENT,
    canReorder: true,
    // Ensure the item under the cursor is always used as the drag source,
    // regardless of which item was previously focused/selected.
    draggedItemOverwritesSelection: true,
    canDrop: (
      items: ItemInstance<FolderTreeData>[],
      target: DragTarget<FolderTreeData>
    ) => {
      const targetId = String(target.item.getId());
      // Documents are leaves — nothing can be dropped into them
      if (targetId.startsWith('doc-')) return false;
      for (const item of items) {
        if (String(item.getId()).startsWith('folder-')) {
          // Folders may only live at root — block drops into other folders
          if (targetId !== 'root') return false;
        }
      }
      return true;
    },
    onDrop: async (
      items: ItemInstance<FolderTreeData>[],
      target: DragTarget<FolderTreeData>
    ) => {
      const dragged = items[0];
      const draggedId = String(dragged.getId());
      const newParentId = String(target.item.getId());

      const applyDrop = createOnDropHandler<FolderTreeData>(
        (item, newChildren) => {
          store.mutateChildren(String(item.getId()), newChildren);
        }
      );
      await applyDrop(items, target);

      // Persist using the post-drop snapshot
      const snapshot = store.getSnapshot();

      if (draggedId.startsWith('folder-')) {
        // Root-level folder reorder: use global positions (index in root.children)
        // for both folders and docs so they share a single position space and
        // buildTreeMap can correctly interleave them after the optimistic update.
        const rootChildren = snapshot['root'].children;
        const folderPositions = rootChildren
          .filter((id) => id.startsWith('folder-'))
          .map((id) => ({
            id: id.replace('folder-', ''),
            position: rootChildren.indexOf(id),
          }));
        callbacksRef.current.onReorderFolders(folderPositions);

        const rootDocs = rootChildren.filter((id) => id.startsWith('doc-'));
        if (rootDocs.length > 0) {
          const docPositions = rootDocs.map((id) => ({
            id: id.replace('doc-', ''),
            position: rootChildren.indexOf(id),
          }));
          callbacksRef.current.onMoveDocument(
            rootDocs[0].replace('doc-', ''),
            null,
            docPositions
          );
        }
      } else if (newParentId === 'root') {
        // Root-level doc reorder: same global-position approach.
        const rootChildren = snapshot['root'].children;
        const docPositions = rootChildren
          .filter((id) => id.startsWith('doc-'))
          .map((id) => ({
            id: id.replace('doc-', ''),
            position: rootChildren.indexOf(id),
          }));
        callbacksRef.current.onMoveDocument(
          draggedId.replace('doc-', ''),
          null,
          docPositions
        );

        const folderPositions = rootChildren
          .filter((id) => id.startsWith('folder-'))
          .map((id) => ({
            id: id.replace('folder-', ''),
            position: rootChildren.indexOf(id),
          }));
        if (folderPositions.length > 0) {
          callbacksRef.current.onReorderFolders(folderPositions);
        }
      } else {
        // Drop into or reorder within a folder: local sequential positions suffice.
        const targetFolderDomainId = newParentId.startsWith('folder-')
          ? newParentId.replace('folder-', '')
          : null;
        const docPositions = (snapshot[newParentId]?.children ?? [])
          .filter((id) => id.startsWith('doc-'))
          .map((id, idx) => ({ id: id.replace('doc-', ''), position: idx }));
        callbacksRef.current.onMoveDocument(
          draggedId.replace('doc-', ''),
          targetFolderDomainId,
          docPositions
        );
      }
    },
    features: [syncDataLoaderFeature, dragAndDropFeature],
  });

  // rebuildTree() is only called on mount by useTree. When external data changes
  // (e.g. new document added to a folder), we must call it to recompute getItems().
  // Also auto-expand the parent folder of the active document after the rebuild,
  // so that a direct URL visit or refresh shows the file in an open folder.
  useEffect(() => {
    tree.rebuildTree();
    const parentFolderId = findParentFolderTreeId(folders, activeItemId);
    if (parentFolderId) {
      tree.getItemInstance(parentFolderId)?.expand();
    }
  }, [externalData, activeItemId]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    expandFolder: (domainId: string) => {
      tree.getItemInstance(`folder-${domainId}`)?.expand();
    },
  }));

  return (
    <div {...tree.getContainerProps()} className="relative outline-none">
      <div
        style={tree.getDragLineStyle()}
        className="pointer-events-none absolute z-10 h-0.5 rounded-full bg-primary"
      />
      {tree.getItems().map((item) => {
        const data = item.getItemData();
        const level = item.getItemMeta().level;

        if (data.type === 'root') return null;

        return (
          <div
            key={String(item.getId())}
            {...item.getProps()}
            style={getItemStyle(level)}
          >
            {data.type === 'folder' ? (
              <FolderItem
                domainId={data.domainId}
                name={data.name}
                isOpen={item.isExpanded()}
                onRename={callbacks.onRenameFolder}
                onDelete={callbacks.onDeleteFolder}
                config={config}
              />
            ) : (
              <TreeItem
                domainId={data.domainId}
                title={data.title}
                isActive={activeItemId === data.domainId}
                onRename={callbacks.onRenameItem}
                onDelete={callbacks.onDeleteItem}
                onClick={callbacks.onClickItem}
                config={config}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
