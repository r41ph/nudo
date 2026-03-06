import type { ComponentType } from 'react';

/** A leaf item in the tree (document, character, etc.) */
export interface TreeLeafItem {
  id: string;
  title: string;
}

/** A folder containing leaf items */
export interface TreeFolderItem {
  id: string;
  name: string;
  position: number;
  items: TreeLeafItem[];
}

/** Position entry for reorder mutations */
export interface ItemPosition {
  id: string;
  position: number;
}

/** Root-level item for reorder mutations */
export interface RootOrderItem {
  type: 'folder' | 'item';
  id: string;
  position: number;
}

/** Callbacks the consumer provides to handle persistence */
export interface FolderTreeCallbacks {
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onRenameItem: (id: string, title: string) => void;
  onDeleteItem: (id: string) => void;
  onClickItem: (item: TreeLeafItem) => void;
  onReorderRoot: (order: RootOrderItem[]) => void;
  onMoveItem: (
    itemId: string,
    targetFolderId: string | null,
    positions: ItemPosition[]
  ) => void;
}

/** UI customization options */
export interface FolderTreeConfig {
  /** Icon component for leaf items (defaults to FileTextIcon) */
  itemIcon?: ComponentType<{ className?: string }>;
  /** Extra actions to render in the folder header (e.g., "New Document" button) */
  folderActions?: (folder: TreeFolderItem) => React.ReactNode;
  /** Placeholder text for empty folder drop zones */
  emptyDropText?: string;
}

/** Internal items record: maps container keys to arrays of prefixed IDs */
export type ItemsRecord = Record<string, string[]>;

/** Internal data map entry */
export interface DataMapEntry {
  type: 'folder' | 'item';
  data: TreeFolderItem | TreeLeafItem;
}
