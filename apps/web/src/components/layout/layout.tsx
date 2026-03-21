import { SidebarProvider } from '@ui/components/ui/sidebar';
import { AppSidebar } from '@web/components/app-sidebar/app-sidebar';
import { ToolsSidebar } from '@web/components/tools-sidebar/tools-sidebar';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-1 flex-col min-h-svh overflow-hidden">
        {children}
      </div>
      <ToolsSidebar />
    </SidebarProvider>
  );
}
