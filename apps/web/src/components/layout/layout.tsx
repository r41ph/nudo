import { SidebarProvider, SidebarTrigger } from '@ui/components/ui/sidebar';
import { AppSidebar } from '@web/components/app-sidebar/app-sidebar';
import { ToolsSidebar } from '@web/components/tools-sidebar/tools-sidebar';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarTrigger />
      <main className="max-w-5xl mx-auto flex-1 px-4">{children}</main>
      <ToolsSidebar />
    </SidebarProvider>
  );
}
