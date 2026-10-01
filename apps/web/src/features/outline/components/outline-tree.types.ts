import type { NodeKind, NodeStatus } from '@web/shared/types/outline.types';

export type OutlineTreeData =
  | { type: 'root' }
  | {
      type: 'node';
      id: string;
      title: string;
      kind: NodeKind;
      status: NodeStatus | null;
      /** Rolled up across the subtree, not the node's own words. */
      wordCount: number;
      hasChildren: boolean;
    };

export interface TreeMapEntry {
  item: OutlineTreeData;
  children: string[];
}

export type TreeMap = Record<string, TreeMapEntry>;

export interface Positions {
  id: string;
  position: number;
}

export interface OutlineTreeCallbacks {
  onOpenNode: (id: string) => void;
  onRenameNode: (id: string, title: string) => void;
  onDeleteNode: (id: string) => void;
  onAddChild: (parentId: string, kind: NodeKind) => void;
  onSetStatus: (id: string, status: NodeStatus | null) => void;
  onOpenDetails: (id: string) => void;
  onMoveNode: (
    nodeId: string,
    targetParentId: string | null,
    positions: Positions[]
  ) => void;
}
