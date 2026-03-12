import { useEffect, useMemo, useRef, useState } from 'react';
import { useTree } from '@headless-tree/react';
import {
  syncDataLoaderFeature,
  dragAndDropFeature,
  createOnDropHandler,
  type ItemInstance,
  type DragTarget,
} from '@headless-tree/core';
import { FolderItem } from './folder-item';
import { TreeItem } from './tree-item';
import type {
  FolderTreeData,
  TreeMap,
  TreeFolderItem,
  TreeLeafItem,
  FolderTreeCallbacks,
  FolderTreeConfig,
} from './folder-tree.types';

interface FolderTreeProps {
  folders: TreeFolderItem[];
  rootItems: TreeLeafItem[];
  callbacks: FolderTreeCallbacks;
  config?: FolderTreeConfig;
  activeItemId?: string;
}

function buildTreeMap(
  folders: TreeFolderItem[],
  rootItems: TreeLeafItem[],
): TreeMap {
  const map: TreeMap = {};

  // Interleave folders + root docs sorted by position
  const rootEntries = [
    ...folders.map((f) => ({ id: `folder-${f.id}`, position: f.position })),
    ...rootItems.map((d, i) => ({
      id: `doc-${d.id}`,
      position: d.position ?? i,
    })),
  ].sort((a, b) => a.position - b.position);

  map['root'] = {
    item: { type: 'root' },
    children: rootEntries.map((e) => e.id),
  };

  for (const folder of folders) {
    map[`folder-${folder.id}`] = {
      item: { type: 'folder', domainId: folder.id, name: folder.name },
      children: folder.items.map((d) => `doc-${d.id}`),
    };
    for (const doc of folder.items) {
      map[`doc-${doc.id}`] = {
        item: { type: 'document', domainId: doc.id, title: doc.title },
        children: [],
      };
    }
  }

  for (const doc of rootItems) {
    map[`doc-${doc.id}`] = {
      item: { type: 'document', domainId: doc.id, title: doc.title },
      children: [],
    };
  }

  return map;
}

const INDENT = 20;

export function FolderTree({
  folders,
  rootItems,
  callbacks,
  config,
  activeItemId,
}: FolderTreeProps) {
  const externalData = useMemo(
    () => buildTreeMap(folders, rootItems),
    [folders, rootItems],
  );

  const [treeData, setTreeData] = useState(externalData);

  // Authoritative source of truth for the dataLoader. Must NOT be synced on
  // every render (doing so resets mutations made inside the async onDrop handler
  // when React re-renders between removeItemsFromParents and insertItemsAtTarget).
  const treeDataRef = useRef(treeData);

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Sync when server data changes (outside of an active drag)
  const prevExternalRef = useRef(externalData);
  if (prevExternalRef.current !== externalData) {
    prevExternalRef.current = externalData;
    treeDataRef.current = externalData;
    setTreeData(externalData);
  }

  const tree = useTree<FolderTreeData>({
    rootItemId: 'root',
    dataLoader: {
      // Read from the ref so that mutations inside onDrop's onChangeChildren
      // callback are visible to subsequent getChildren() calls within the
      // same createOnDropHandler invocation (avoids duplicate entries).
      getItem: (id) =>
        treeDataRef.current[id]?.item ?? ({ type: 'root' } as FolderTreeData),
      getChildren: (id) => treeDataRef.current[id]?.children ?? [],
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
      target: DragTarget<FolderTreeData>,
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
      target: DragTarget<FolderTreeData>,
    ) => {
      const dragged = items[0];
      const draggedId = String(dragged.getId());
      const newParentId = String(target.item.getId());

      // Immediately mutate the ref in the callback so that
      // insertItemsAtTarget (inside createOnDropHandler) sees the post-removal
      // children when it calls getChildren() — prevents duplicate entries.
      const applyDrop = createOnDropHandler<FolderTreeData>(
        (item, newChildren) => {
          const itemId = String(item.getId());
          treeDataRef.current = {
            ...treeDataRef.current,
            [itemId]: { ...treeDataRef.current[itemId], children: newChildren },
          };
        },
      );
      await applyDrop(items, target);

      // Sync React state from the now-correct ref
      setTreeData(treeDataRef.current);

      // Persist
      if (draggedId.startsWith('folder-')) {
        // Root-level folder reorder: use global positions (index in root.children)
        // for both folders and docs so they share a single position space and
        // buildTreeMap can correctly interleave them after the optimistic update.
        const rootChildren = treeDataRef.current['root'].children;
        const folderPositions = rootChildren
          .filter((id) => id.startsWith('folder-'))
          .map((id) => ({ id: id.replace('folder-', ''), position: rootChildren.indexOf(id) }));
        callbacksRef.current.onReorderFolders(folderPositions);

        const rootDocs = rootChildren.filter((id) => id.startsWith('doc-'));
        if (rootDocs.length > 0) {
          const docPositions = rootDocs.map((id) => ({
            id: id.replace('doc-', ''),
            position: rootChildren.indexOf(id),
          }));
          callbacksRef.current.onMoveDocument(rootDocs[0].replace('doc-', ''), null, docPositions);
        }
      } else if (newParentId === 'root') {
        // Root-level doc reorder: same global-position approach.
        const rootChildren = treeDataRef.current['root'].children;
        const docPositions = rootChildren
          .filter((id) => id.startsWith('doc-'))
          .map((id) => ({ id: id.replace('doc-', ''), position: rootChildren.indexOf(id) }));
        callbacksRef.current.onMoveDocument(draggedId.replace('doc-', ''), null, docPositions);

        const folderPositions = rootChildren
          .filter((id) => id.startsWith('folder-'))
          .map((id) => ({ id: id.replace('folder-', ''), position: rootChildren.indexOf(id) }));
        if (folderPositions.length > 0) {
          callbacksRef.current.onReorderFolders(folderPositions);
        }
      } else {
        // Drop into or reorder within a folder: local sequential positions suffice.
        const targetFolderDomainId = newParentId.startsWith('folder-')
          ? newParentId.replace('folder-', '')
          : null;
        const docPositions = (treeDataRef.current[newParentId]?.children ?? [])
          .filter((id) => id.startsWith('doc-'))
          .map((id, idx) => ({ id: id.replace('doc-', ''), position: idx }));
        callbacksRef.current.onMoveDocument(
          draggedId.replace('doc-', ''),
          targetFolderDomainId,
          docPositions,
        );
      }
    },
    features: [syncDataLoaderFeature, dragAndDropFeature],
  });

  // rebuildTree() is only called on mount by useTree. When external data changes
  // (e.g. new document added to a folder), we must call it to recompute getItems().
  useEffect(() => {
    tree.rebuildTree();
  }, [externalData]); // eslint-disable-line react-hooks/exhaustive-deps

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
            style={{ paddingLeft: `${level * INDENT}px` }}
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
