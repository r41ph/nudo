import { Link, useMatch } from 'react-router-dom';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ui/components/ui/sidebar';
import { SIDEBAR_TOOLS } from '@web/features/sidebar/sidebar.constants';
import { useProjectId } from '@web/shared/hooks/use-project-id';
import { plotPath, projectPath } from '@web/shared/lib/routes';

const TOOL_BUTTON_CLASS =
  'h-[29px] rounded-[7px] px-2.5 text-[13.5px] text-prose hover:cursor-pointer hover:bg-row-hover hover:text-foreground disabled:opacity-100 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-foreground data-[active=true]:hover:bg-sidebar-accent';

export function ToolList() {
  const projectId = useProjectId();
  const onPlot = useMatch('/project/:projectId/plot') !== null;

  return (
    <nav aria-label="Tools" className="mt-5.5">
      <SidebarMenu className="gap-[3px]">
        {SIDEBAR_TOOLS.map(({ label, tool }) => {
          if (!tool || !projectId) {
            return (
              <SidebarMenuItem key={label}>
                <SidebarMenuButton disabled className={TOOL_BUTTON_CLASS}>
                  {label}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }
          const active = tool === 'plot' ? onPlot : !onPlot;
          const to =
            tool === 'plot' ? plotPath(projectId) : projectPath(projectId);
          return (
            <SidebarMenuItem key={label}>
              <SidebarMenuButton
                asChild
                isActive={active}
                className={TOOL_BUTTON_CLASS}
              >
                <Link to={to} aria-current={active ? 'page' : undefined}>
                  {label}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </nav>
  );
}
