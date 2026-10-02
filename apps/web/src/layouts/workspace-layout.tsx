import type { ReactNode } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { AppSidebar } from '@web/features/sidebar/components/app-sidebar';
import { SIDEBAR_WIDTH } from '@web/features/sidebar/sidebar.constants';
import { OUTLINE_PANEL_ID } from '@web/shared/constants/panels.constants';
import { SidePanel } from '@web/shared/components/side-panel';
import { usePanels } from '@web/shared/hooks/use-panels';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import { setOutlineOpenAtom } from '@web/shared/state/panels.atom';

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const isFocusMode = useAtomValue(isFocusModeAtom);
  const { isDesktop, outlineExpanded } = usePanels();
  const setOutlineOpen = useSetAtom(setOutlineOpenAtom);

  // flex-1: below 1280px and in focus mode no h-svh column is left in the row
  // to stretch it, and the page must still fill the viewport.
  return (
    <div className="flex flex-1">
      {!isFocusMode &&
        (isDesktop ? (
          <div className="sticky top-0 self-start h-svh">
            <AppSidebar />
          </div>
        ) : (
          <SidePanel
            id={OUTLINE_PANEL_ID}
            side="left"
            width={SIDEBAR_WIDTH}
            label="Outline"
            collapsed={!outlineExpanded}
            onCollapse={() => setOutlineOpen(false)}
          >
            <AppSidebar />
          </SidePanel>
        ))}
      {children}
    </div>
  );
}
