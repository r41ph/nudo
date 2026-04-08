import type { ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { AppSidebar } from '@web/features/sidebar/components/app-sidebar';
import { ToolsSidebar } from '@web/layouts/components/tools-sidebar';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';

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
