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

  // `TopBar` is the global app chrome (wordmark + theme switch) for non-editor
  // pages — future projects/settings lists, logged-out pages, etc. Reuse/extend
  // it for those rather than building a new header. Today the only such page is
  // the no-documents empty state, since `/` redirects into the editor once any
  // document exists; the editor route renders `EditorTopBar` instead, and focus
  // mode hides all chrome.
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
