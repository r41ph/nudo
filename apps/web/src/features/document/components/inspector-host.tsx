import { useAtomValue } from 'jotai';
import { DocumentInspector } from '@web/features/document/components/document-inspector';
import { INSPECTOR_WIDTH } from '@web/features/document/constants/inspector.constants';
import type { DocumentDetails } from '@web/features/document/document.types';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import { inspectorAtom } from '@web/shared/state/panels.atom';

export function InspectorHost({ details }: { details: DocumentDetails }) {
  const { isOpen } = useAtomValue(inspectorAtom);
  const isFocusMode = useAtomValue(isFocusModeAtom);

  if (!isOpen || isFocusMode) return null;

  // Sticky like the outline column in WorkspaceLayout: the page itself
  // scrolls, so the panel has to hold its place against it.
  return (
    <aside
      aria-label="Document details"
      style={{ width: INSPECTOR_WIDTH }}
      className="sticky top-0 h-svh shrink-0 self-start border-l border-border bg-background"
    >
      {/* Keyed so a document switch starts from that document's values. */}
      <DocumentInspector key={details.id} details={details} />
    </aside>
  );
}
