import { Link, useLocation, useMatch } from 'react-router-dom';
import { Icon } from '@ui/components/icon/icon';
import { Button } from '@ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import {
  SIDEBAR_MENU_SURFACE,
  SIDEBAR_TOOLS,
} from '@web/features/sidebar/sidebar.constants';
import { useProjectId } from '@web/shared/hooks/use-project-id';
import { PLOT_ROUTE, plotPath, projectPath } from '@web/shared/lib/routes';

const ITEM_CLASS =
  'h-10 gap-2.5 rounded-lg px-[9px] py-0 text-[14px] text-foreground ' +
  'hover:cursor-pointer focus:bg-row-hover focus:text-foreground ' +
  'aria-[current=page]:bg-row-hover ' +
  'data-[disabled]:text-muted-foreground data-[disabled]:opacity-100 ' +
  '[&_svg]:size-4 [&_svg]:text-muted-foreground';

export function ViewSwitcher() {
  const projectId = useProjectId();
  const location = useLocation();
  const current = useMatch(PLOT_ROUTE) ? 'plot' : 'story';
  const currentTool = SIDEBAR_TOOLS.find(({ tool }) => tool === current)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={`View: ${currentTool.label}`}
          className="mt-5.5 h-11 w-full justify-start gap-2.5 rounded-[10px] bg-sidebar-accent px-3 hover:cursor-pointer hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent has-[>svg]:px-3"
        >
          <Icon
            name={currentTool.icon}
            decorative
            className="size-4 text-foreground"
          />
          <span className="text-[14px] font-medium text-foreground">
            {currentTool.label}
          </span>
          <Icon
            name="chevronsUpDown"
            decorative
            className="ml-auto size-4 text-muted-foreground"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className={`w-[var(--radix-dropdown-menu-trigger-width)] ${SIDEBAR_MENU_SURFACE}`}
      >
        {SIDEBAR_TOOLS.map(({ label, tool, icon }) => {
          if (!tool || !projectId) {
            return (
              <DropdownMenuItem key={label} disabled className={ITEM_CLASS}>
                <Icon name={icon} decorative />
                {label}
              </DropdownMenuItem>
            );
          }
          const active = tool === current;
          return (
            <DropdownMenuItem key={label} asChild className={ITEM_CLASS}>
              <Link
                // Story's target is the project root, which would leave the
                // open document. Linking to where we are makes the current
                // view a no-op; preventDefault would stop Radix closing the menu.
                to={
                  active
                    ? location
                    : tool === 'plot'
                      ? plotPath(projectId)
                      : projectPath(projectId)
                }
                aria-current={active ? 'page' : undefined}
              >
                <Icon name={icon} decorative />
                {label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
