import type { ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { SidebarProvider } from '@ui/components/ui/sidebar';
import { TopBar } from '@web/layouts/components/top-bar';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import { ThemeToggle } from '@web/shared/components/theme-toggle';

export function AppLayout({ children }: { children: ReactNode }) {
  const isFocusMode = useAtomValue(isFocusModeAtom);

  return (
    <SidebarProvider>
      <div className="flex flex-col w-full min-h-svh">
        {!isFocusMode && (
          <TopBar>
            <ThemeToggle />
          </TopBar>
        )}
        {children}
      </div>
    </SidebarProvider>
  );
}
