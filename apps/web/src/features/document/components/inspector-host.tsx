import { useAtomValue, useSetAtom } from 'jotai';
import { DocumentInspector } from '@web/features/document/components/document-inspector';
import { INSPECTOR_WIDTH } from '@web/features/document/constants/inspector.constants';
import type { DocumentDetails } from '@web/features/document/document.types';
import { SidePanel } from '@web/shared/components/side-panel';
import { INSPECTOR_PANEL_ID } from '@web/shared/constants/panels.constants';
import { usePanels } from '@web/shared/hooks/use-panels';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import {
  inspectorAtom,
  setInspectorCollapsedAtom,
} from '@web/shared/state/panels.atom';

const LABEL = 'Document details';

export function InspectorHost({ details }: { details: DocumentDetails }) {
  const { isOpen } = useAtomValue(inspectorAtom);
  const isFocusMode = useAtomValue(isFocusModeAtom);
  const { isDesktop, inspectorExpanded } = usePanels();
  const setCollapsed = useSetAtom(setInspectorCollapsedAtom);

  if (!isOpen || isFocusMode) return null;

  // Keyed so a document switch starts from that document's values.
  const inspector = <DocumentInspector key={details.id} details={details} />;

  if (!isDesktop) {
    return (
      <SidePanel
        id={INSPECTOR_PANEL_ID}
        side="right"
        width={INSPECTOR_WIDTH}
        label={LABEL}
        collapsed={!inspectorExpanded}
        onCollapse={() => setCollapsed(true)}
      >
        {inspector}
      </SidePanel>
    );
  }

  // Sticky like the outline column in WorkspaceLayout: the page itself
  // scrolls, so the panel has to hold its place against it.
  return (
    <aside
      id={INSPECTOR_PANEL_ID}
      aria-label={LABEL}
      style={{ width: INSPECTOR_WIDTH }}
      className="sticky top-0 h-svh shrink-0 self-start border-l border-border bg-background"
    >
      {inspector}
    </aside>
  );
}
