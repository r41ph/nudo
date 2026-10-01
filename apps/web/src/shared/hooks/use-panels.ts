import { useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useMediaQuery } from '@web/shared/hooks/use-media-query';
import {
  inspectorAtom,
  outlineOpenAtom,
  setInspectorCollapsedAtom,
  setOutlineOpenAtom,
} from '@web/shared/state/panels.atom';

// Tailwind's `xl`. Below it, outline + inspector + the text column no longer
// fit side by side (1024px would leave a 329px column).
export const COLLAPSE_BREAKPOINT = 1280;

const WIDE_QUERY = `(min-width: ${COLLAPSE_BREAKPOINT}px)`;

export function usePanels() {
  const isDesktop = useMediaQuery(WIDE_QUERY);
  const inspector = useAtomValue(inspectorAtom);
  const outlineOpen = useAtomValue(outlineOpenAtom);
  const setOutlineOpen = useSetAtom(setOutlineOpenAtom);
  const setInspectorCollapsed = useSetAtom(setInspectorCollapsedAtom);

  const toggleOutline = useCallback(
    () => setOutlineOpen(!outlineOpen),
    [setOutlineOpen, outlineOpen]
  );

  const toggleInspector = useCallback(
    () => setInspectorCollapsed(!inspector.collapsed),
    [setInspectorCollapsed, inspector.collapsed]
  );

  // Visibility is derived from the viewport rather than written back into the
  // atoms, so crossing the breakpoint needs no effect and the narrow layout
  // returns as the writer left it.
  return {
    isDesktop,
    outlineExpanded: isDesktop || outlineOpen,
    inspectorExpanded: inspector.isOpen && (isDesktop || !inspector.collapsed),
    showOutlineToggle: !isDesktop,
    showInspectorToggle: !isDesktop && inspector.isOpen,
    toggleOutline,
    toggleInspector,
  };
}
