import { SidebarProvider, SidebarTrigger } from '@ui/components/ui/sidebar';
import { AppSidebar } from '@web/components/app-sidebar/app-sidebar';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main>
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
}
