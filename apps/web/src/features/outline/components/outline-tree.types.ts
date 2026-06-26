import type { NodeKind, NodeStatus } from '@web/shared/types/outline.types';

/** Per-node data carried in the headless-tree map. */
export type OutlineTreeData =
  | { type: 'root' }
  | {
      type: 'node';
      id: string;
      title: string;
      kind: NodeKind;
      status: NodeStatus | null;
      /** Rolled-up subtree word count (own words + every descendant's). */
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
  /** Open a node in the editor (every node holds prose). */
  onOpenNode: (id: string) => void;
  onRenameNode: (id: string, title: string) => void;
  onDeleteNode: (id: string) => void;
  /** Add a child of the chosen kind under `parentId`. */
  onAddChild: (parentId: string, kind: NodeKind) => void;
  onSetStatus: (id: string, status: NodeStatus | null) => void;
  /** Reparent + reorder. `targetParentId` null = root. */
  onMoveNode: (
    nodeId: string,
    targetParentId: string | null,
    positions: Positions[]
  ) => void;
}
