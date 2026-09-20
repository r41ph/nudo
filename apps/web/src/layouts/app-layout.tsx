import type { CSSProperties, ReactNode } from 'react';
import { SidebarProvider } from '@ui/components/ui/sidebar';
import { SIDEBAR_WIDTH } from '@web/features/sidebar/sidebar.constants';

const sidebarStyle = { '--sidebar-width': SIDEBAR_WIDTH } as CSSProperties;

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex flex-col w-full min-h-svh">{children}</div>
    </SidebarProvider>
  );
}
