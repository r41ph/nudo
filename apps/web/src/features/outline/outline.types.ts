/**
 * A node's behavioural kind:
 *  - document  — a leaf you write in.
 *  - folder    — a container (a document auto-becomes one when you nest inside).
 *  - separator — a flat scoping marker (no prose, no children).
 */
export type NodeKind = 'document' | 'folder' | 'separator';

/** Writing-progress status. Meaningful for documents and folders; null elsewhere. */
export type NodeStatus = 'planned' | 'drafting' | 'done';

/**
 * One node in the uniform outline tree. Every node is a `document`: it can hold
 * prose and children, lives at the root (`parentId === null`) or under any
 * other node. `wordCount` is the node's OWN word count; rolled-up totals are
 * derived when building the tree.
 */
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
