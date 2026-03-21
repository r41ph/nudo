import { Button } from '@ui/components/ui/button';
import { Icon } from '@ui/components/icon/icon';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from '@ui/components/ui/sidebar';

export function ToolsSidebar() {
  return (
    <Sidebar side="right" className="w-14">
      <SidebarHeader className="flex items-center justify-center py-3 border-b border-sidebar-border">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          title="Fullscreen"
        >
          <Icon name="maximize" className="h-4 w-4" />
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
