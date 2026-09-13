export type DocumentForAdjacency = {
  id: string;
  parentId: string | null;
  position: number;
};

// Next sibling, else previous, else any remaining node — how Bear and Notion
// keep you oriented after a delete.
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

  return firstRemainingDocumentId(remaining);
}

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
