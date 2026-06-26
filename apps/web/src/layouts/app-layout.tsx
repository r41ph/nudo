import type { ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { SidebarProvider } from '@ui/components/ui/sidebar';
import { TopBar } from '@web/layouts/components/top-bar';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import { ThemeToggle } from '@web/shared/components/theme-toggle';
import { useIsEditorRoute } from '@web/shared/hooks/use-editor-route';

export function AppLayout({ children }: { children: ReactNode }) {
  const isFocusMode = useAtomValue(isFocusModeAtom);
  const isEditorRoute = useIsEditorRoute();

  // The editor route renders its own consolidated top bar (EditorTopBar), so the
  // global chrome is suppressed there as well as in focus mode.
  const showTopBar = !isFocusMode && !isEditorRoute;

  return (
    <SidebarProvider>
      <div className="flex flex-col w-full min-h-svh">
        {showTopBar && (
          <TopBar>
            <ThemeToggle />
          </TopBar>
        )}
        {children}
      </div>
    </SidebarProvider>
  );
}
