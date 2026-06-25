export type DocumentForAdjacency = {
  id: string;
  parentId: string | null;
  position: number;
};

/**
 * Given all outline nodes and the id of the one being deleted, returns the id
 * of the node to open next — mirroring how note apps (Bear, Notion) keep you
 * oriented after a delete.
 *
 * Preference order:
 *   1. The next sibling under the same parent, by position.
 *   2. The previous sibling, if the deleted one was last.
 *   3. Any remaining node if that sibling group is now empty.
 *   4. `null` when no nodes remain — caller shows the empty state.
 */
export function pickAdjacentDocumentId(
  documents: DocumentForAdjacency[],
  deletedId: string
): string | null {
  const remaining = documents.filter((d) => d.id !== deletedId);
  if (remaining.length === 0) return null;

  const deleted = documents.find((d) => d.id === deletedId);
  if (!deleted) return firstRemainingDocumentId(remaining);

  const siblings = remaining
    .filter((d) => d.parentId === deleted.parentId)
    .sort((a, b) => a.position - b.position);

  if (siblings.length > 0) {
    const next = siblings.find((d) => d.position > deleted.position);
    return (next ?? siblings[siblings.length - 1]).id;
  }

  // The deleted node's sibling group is now empty — fall back to a remaining one.
  return firstRemainingDocumentId(remaining);
}

/**
 * Returns the node to open after a whole subtree (a node and every descendant)
 * is deleted. Sibling adjacency doesn't apply — pick any remaining node.
 * Returns `null` when none remain.
 */
export function pickDocumentAfterContainerDeletion(
  documents: DocumentForAdjacency[],
  deletedIds: string[]
): string | null {
  const removed = new Set(deletedIds);
  return firstRemainingDocumentId(documents.filter((d) => !removed.has(d.id)));
}

function firstRemainingDocumentId(
  remaining: DocumentForAdjacency[]
): string | null {
  if (remaining.length === 0) return null;
  return [...remaining].sort((a, b) => a.position - b.position)[0].id;
}
