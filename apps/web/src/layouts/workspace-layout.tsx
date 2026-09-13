import type { ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { AppSidebar } from '@web/features/sidebar/components/app-sidebar';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import { useIsEditorRoute } from '@web/shared/hooks/use-editor-route';

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const isFocusMode = useAtomValue(isFocusModeAtom);
  const isEditorRoute = useIsEditorRoute();

  const railSticky = isEditorRoute
    ? 'sticky top-0 self-start h-svh'
    : 'sticky top-12 self-start h-[calc(100svh-3rem)]';

  return (
    <div className="flex">
      {!isFocusMode && (
        <div className={railSticky}>
          <AppSidebar />
        </div>
      )}
      {children}
    </div>
  );
}
