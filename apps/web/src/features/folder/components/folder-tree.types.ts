import type { ComponentType, ReactNode } from 'react';

/** Public types used by consumers (e.g., manuscripts-section) */
export interface TreeLeafItem {
  id: string;
  title: string;
  position?: number;
}

export interface TreeFolderItem {
  id: string;
  name: string;
  position: number;
  items: TreeLeafItem[];
}

/** Internal headless-tree data — one union per node type */
export type FolderTreeData =
  | { type: 'root' }
  | { type: 'folder'; domainId: string; name: string }
  | { type: 'document'; domainId: string; title: string };

/** Internal data structure: item data + children IDs per node */
export type TreeMap = Record<
  string,
  { item: FolderTreeData; children: string[] }
>;

/** Callbacks the consumer provides to handle persistence */
export interface FolderTreeCallbacks {
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onRenameItem: (id: string, title: string) => void;
  onDeleteItem: (id: string) => void;
  onClickItem: (id: string) => void;
  onReorderFolders: (
    positions: Array<{ id: string; position: number }>
  ) => void;
  onMoveDocument: (
    docId: string,
    targetFolderId: string | null,
    positions: Array<{ id: string; position: number }>
  ) => void;
}

/** UI customization */
export interface FolderTreeConfig {
  itemIcon?: ComponentType<{ className?: string }>;
  folderActions?: (folderId: string) => ReactNode;
}
