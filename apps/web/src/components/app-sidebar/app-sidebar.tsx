import { Sidebar, SidebarContent } from '@ui/components/ui/sidebar';
import { ProjectHeader } from './project-header';
import { ManuscriptsSection } from './sections/manuscripts-section';
import { SidebarFooterActions } from './sidebar-footer-actions';

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
