import { useSetAtom } from 'jotai';
import { Button } from '@ui/components/ui/button';
import { Icon } from '@ui/components/icon/icon';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from '@ui/components/ui/sidebar';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';

export function ToolsSidebar() {
  const setFocusMode = useSetAtom(isFocusModeAtom);

  return (
    <Sidebar
      side="right"
      collapsible="none"
      className="w-fit"
    >
      <SidebarHeader className="flex items-center justify-center px-3 py-3 border-b border-sidebar-border">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          title="Focus Mode"
          onClick={() => setFocusMode(true)}
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
