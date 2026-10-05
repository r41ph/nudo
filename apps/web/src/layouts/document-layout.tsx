import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { PANEL_MOTION_MS } from '@web/shared/components/side-panel';
import { usePanels } from '@web/shared/hooks/use-panels';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import { inspectorAtom } from '@web/shared/state/panels.atom';
import { EditorTopBar } from '@web/features/document/components/editor-top-bar';
import { WordCountStrip } from '@web/features/document/components/word-count-strip';
import { InspectorHost } from '@web/features/document/components/inspector-host';
import { INSPECTOR_WIDTH } from '@web/features/document/constants/inspector.constants';
import {
  MANUSCRIPT_GUTTER as G,
  MANUSCRIPT_MAX_WIDTH as C,
} from '@web/features/document/constants/manuscript.constants';
import type { DocumentDetails } from '@web/features/document/document.types';

// Centered on the window rather than the editor area: the outline sits on the
// left only, so area-centering lands the text right of where the writer looks.
// The clamp keeps a gutter beside each panel; when both bounds bind, the column
// shrinks and is centered in the area. 100cqw is the editor area's width.
const columnStyle = {
  width: `min(${C}, 100cqw - 2 * ${G})`,
  marginLeft: `clamp(${G}, (100cqw + var(--inspector-inset, 0px) - var(--outline-inset, 0px) - ${C}) / 2, 100cqw - ${G} - ${C})`,
  transitionDuration: `${PANEL_MOTION_MS}ms`,
} as CSSProperties;

export function DocumentLayout({
  children,
  details,
}: {
  children: ReactNode;
  details: DocumentDetails;
}) {
  const [isFocusMode, setFocusMode] = useAtom(isFocusModeAtom);
  const { isOpen: isInspectorOpen } = useAtomValue(inspectorAtom);
  const { isDesktop } = usePanels();
  // Mirrors when InspectorHost docks the panel beside the text.
  const isInspectorDocked = isInspectorOpen && !isFocusMode && isDesktop;
  const insetStyle = {
    '--inspector-inset': isInspectorDocked ? INSPECTOR_WIDTH : '0px',
  } as CSSProperties;

  useEffect(() => {
    if (!isFocusMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // A menu or dialog closing on Escape shouldn't also exit focus mode.
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      setFocusMode(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isFocusMode, setFocusMode]);

  return (
    <div className="flex min-w-0 flex-1" style={insetStyle}>
      <div className="flex min-w-0 flex-1 flex-col">
        <EditorTopBar />
        <main className="@container flex-1">
          <div
            style={columnStyle}
            className="pt-[34px] motion-safe:transition-[margin-left] motion-safe:ease-out"
          >
            {children}
          </div>
        </main>
        <WordCountStrip />
      </div>
      <InspectorHost details={details} />
    </div>
  );
}
