import { Sidebar, SidebarContent } from '@ui/components/ui/sidebar';
import { ProjectHeader } from '@web/features/sidebar/components/project-header';
import { DraftSection } from '@web/features/sidebar/components/sections/draft-section';
import { SidebarFooterActions } from '@web/features/sidebar/components/sidebar-footer-actions';

export function AppSidebar() {
  return (
    <Sidebar collapsible="none" className="px-4 pt-6 pb-5">
      <ProjectHeader />
      <SidebarContent className="mt-6">
        <DraftSection />
      </SidebarContent>
      <SidebarFooterActions />
    </Sidebar>
  );
}
