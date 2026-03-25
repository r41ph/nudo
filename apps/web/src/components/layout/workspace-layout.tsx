import type { ReactNode } from 'react';
import { AppSidebar } from '@web/components/app-sidebar/app-sidebar';
import { ToolsSidebar } from '@web/components/tools-sidebar/tools-sidebar';

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex">
      <div className="sticky top-12 self-start h-[calc(100svh-3rem)]">
        <AppSidebar />
      </div>
      {children}
      <div className="sticky top-12 self-start h-[calc(100svh-3rem)]">
        <ToolsSidebar />
      </div>
    </div>
  );
}
