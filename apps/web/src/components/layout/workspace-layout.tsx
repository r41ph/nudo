import type { ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { AppSidebar } from '@web/components/app-sidebar/app-sidebar';
import { ToolsSidebar } from '@web/components/tools-sidebar/tools-sidebar';
import { isFocusModeAtom } from '@web/state/focus-mode.atom';

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const isFocusMode = useAtomValue(isFocusModeAtom);

  return (
    <div className="flex">
      {!isFocusMode && (
        <div className="sticky top-12 self-start h-[calc(100svh-3rem)]">
          <AppSidebar />
        </div>
      )}
      {children}
      {!isFocusMode && (
        <div className="sticky top-12 self-start h-[calc(100svh-3rem)]">
          <ToolsSidebar />
        </div>
      )}
    </div>
  );
}
