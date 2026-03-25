import type { ReactNode } from 'react';
import { SidebarProvider } from '@ui/components/ui/sidebar';
import { TopBar } from './top-bar';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex flex-col w-full min-h-svh">
        <TopBar />
        {children}
      </div>
    </SidebarProvider>
  );
}
