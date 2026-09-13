import { Sidebar, SidebarContent } from '@ui/components/ui/sidebar';
import { ProjectHeader } from '@web/features/sidebar/components/project-header';
import { ManuscriptsSection } from '@web/features/sidebar/components/sections/manuscripts-section';
import { SidebarFooterActions } from '@web/features/sidebar/components/sidebar-footer-actions';

export function AppSidebar() {
  return (
    <Sidebar
      collapsible="none"
      className="border-r border-gray-200 dark:border-gray-800"
    >
      <ProjectHeader name="Project Alpha" />
      <SidebarContent>
        <ManuscriptsSection />
      </SidebarContent>
      <SidebarFooterActions />
    </Sidebar>
  );
}
