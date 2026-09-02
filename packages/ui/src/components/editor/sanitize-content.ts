/**
 * Leaf properties that were written into documents by bugs and no longer map to
 * any registered plugin. They render as nothing, but they persist in saved
 * content and would leak into exports/serialization, so they are stripped when
 * content is loaded into the editor.
 *
 * `pilcrow` came from the Paragraph (¶) toolbar button, which used to be a
 * `MarkToolbarButton nodeType="pilcrow"`. No plugin registers a `pilcrow` mark,
 * so every click wrote `pilcrow: true` onto the selected leaves instead of
 * converting the block to body text.
 */
export const LEGACY_MARKS = ['pilcrow'] as const;

type Node = Record<string, unknown> & { children?: unknown };

/**
 * Recursively removes {@link LEGACY_MARKS} from a Plate value.
 *
 * Returns the original reference when nothing needed stripping, so loading
 * clean documents does not churn object identity (and does not mark the
 * document dirty).
 */
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
