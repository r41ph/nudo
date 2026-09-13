// A document auto-becomes a folder when something is nested inside it; a
// separator holds no prose and no children.
export type NodeKind = 'document' | 'folder' | 'separator';

export type NodeStatus = 'planned' | 'drafting' | 'done';

// `wordCount` is the node's own; subtree totals are derived when building the tree.
export interface OutlineNode {
  id: string;
  title: string;
  parentId: string | null;
  position: number;
  kind: NodeKind;
  status: NodeStatus | null;
  wordCount: number;
}

export interface OutlineQueryData {
  allDocuments: { nodes: OutlineNode[] };
}
