import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ui/components/ui/sidebar';
import { SIDEBAR_TOOLS } from '@web/features/sidebar/sidebar.constants';

export function ToolList() {
  return (
    <nav aria-label="Tools" className="mt-5.5">
      <SidebarMenu className="gap-[3px]">
        {SIDEBAR_TOOLS.map(({ label, active }) => (
          <SidebarMenuItem key={label}>
            <SidebarMenuButton
              isActive={active}
              disabled={!active}
              aria-current={active ? 'page' : undefined}
              className="h-[29px] rounded-[7px] px-2.5 text-[13.5px] text-prose hover:cursor-pointer hover:bg-row-hover hover:text-foreground disabled:opacity-100 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-foreground data-[active=true]:hover:bg-sidebar-accent"
            >
              {label}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </nav>
  );
}
