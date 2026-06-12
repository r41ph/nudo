export type DocumentForAdjacency = {
  id: string;
  folderId: string | null;
  position: number;
};

/**
 * Given the current documents and the id of the one being deleted, returns the
 * id of the document to open next — mirroring how note apps (Bear, Notion)
 * keep you oriented after a delete.
 *
 * Preference order:
 *   1. The next sibling in the same container (folder or root), by position.
 *   2. The previous sibling, if the deleted one was last in its container.
 *   3. Any remaining document (root first) if the container is now empty.
 *   4. `null` when no documents remain — caller shows the empty state.
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
    .filter((d) => d.folderId === deleted.folderId)
    .sort((a, b) => a.position - b.position);

  if (siblings.length > 0) {
    const next = siblings.find((d) => d.position > deleted.position);
    return (next ?? siblings[siblings.length - 1]).id;
  }

  // The deleted document's container is now empty — fall back to a remaining
  // document.
  return firstRemainingDocumentId(remaining);
}

/**
 * Returns the document to open after a whole folder (and every document in it)
 * is deleted. Sibling adjacency doesn't apply — the container is gone — so pick
 * any remaining document, root-first. Returns `null` when none remain.
 */
export function pickDocumentAfterFolderDeletion(
  documents: DocumentForAdjacency[],
  deletedIds: string[]
): string | null {
  const removed = new Set(deletedIds);
  return firstRemainingDocumentId(documents.filter((d) => !removed.has(d.id)));
}

// Prefer a root document (by position), otherwise the first remaining document.
function firstRemainingDocumentId(
  remaining: DocumentForAdjacency[]
): string | null {
  if (remaining.length === 0) return null;
  const roots = remaining
    .filter((d) => !d.folderId)
    .sort((a, b) => a.position - b.position);
  return (roots[0] ?? remaining[0]).id;
}
