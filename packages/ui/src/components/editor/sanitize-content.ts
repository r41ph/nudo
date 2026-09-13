// Leaf properties written by past bugs that no plugin registers; harmless to
// render but they persist in saved content and would leak into exports.
// `pilcrow`: the old Paragraph button was a `MarkToolbarButton` and wrote this
// mark instead of converting the block.
export const LEGACY_MARKS = ['pilcrow'] as const;

type Node = Record<string, unknown> & { children?: unknown };

// Returns the original reference when nothing was stripped, so a clean load
// doesn't mark the document dirty.
export function stripUnknownMarks<T>(value: T): T {
  if (!Array.isArray(value)) return value;

  let changed = false;

  const next = value.map((node) => {
    if (!node || typeof node !== 'object') return node;

    const current = node as Node;
    let nodeChanged = false;
    const cleaned: Node = {};

    for (const [key, val] of Object.entries(current)) {
      if ((LEGACY_MARKS as readonly string[]).includes(key)) {
        nodeChanged = true;
        continue;
      }
      cleaned[key] = val;
    }

    if (Array.isArray(current.children)) {
      const children = stripUnknownMarks(current.children);
      if (children !== current.children) {
        cleaned.children = children;
        nodeChanged = true;
      }
    }

    if (!nodeChanged) return node;

    changed = true;
    return cleaned;
  });

  return (changed ? next : value) as T;
}
