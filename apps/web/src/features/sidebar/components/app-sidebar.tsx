import { useMatch } from 'react-router-dom';
import { cn } from '@ui/lib/utils';
import { Sidebar, SidebarContent } from '@ui/components/ui/sidebar';
import { PlotSidebarPanel } from '@web/features/plot/components/sidebar/plot-sidebar-panel';
import { ProjectHeader } from '@web/features/sidebar/components/project-header';
import { DraftSection } from '@web/features/sidebar/components/sections/draft-section';
import { SidebarFooterActions } from '@web/features/sidebar/components/sidebar-footer-actions';
import { PLOT_ROUTE } from '@web/shared/lib/routes';

export function AppSidebar() {
  const onPlot = useMatch(PLOT_ROUTE) !== null;

  // The plot panel's lists scroll on their own; a scrolling body would carry
  // the section headers and the counter away with them.
  return (
    <Sidebar collapsible="none" className="px-4 pt-6 pb-5">
      <ProjectHeader />
      <SidebarContent className={cn('mt-6', onPlot && 'overflow-hidden')}>
        {onPlot ? <PlotSidebarPanel /> : <DraftSection />}
      </SidebarContent>
      <SidebarFooterActions />
    </Sidebar>
  );
}
