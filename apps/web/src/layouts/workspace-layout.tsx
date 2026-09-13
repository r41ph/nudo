import type { ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { AppSidebar } from '@web/features/sidebar/components/app-sidebar';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const isFocusMode = useAtomValue(isFocusModeAtom);

  return (
    <div className="flex">
      {!isFocusMode && (
        <div className="sticky top-0 self-start h-svh">
          <AppSidebar />
        </div>
      )}
      {children}
    </div>
  );
}
