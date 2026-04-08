import { Sidebar, SidebarContent } from '@ui/components/ui/sidebar';
import { ProjectHeader } from '@web/features/sidebar/components/project-header';
import { ManuscriptsSection } from '@web/features/sidebar/components/sections/manuscripts-section';
import { SidebarFooterActions } from '@web/features/sidebar/components/sidebar-footer-actions';

export function AppSidebar() {
  return (
    <Sidebar collapsible="none">
      <ProjectHeader name="Project Alpha" />
      <SidebarContent>
        <ManuscriptsSection />
      </SidebarContent>
      <SidebarFooterActions />
    </Sidebar>
  );
}
