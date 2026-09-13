import { useAtomValue } from 'jotai';
import { Icon } from '@ui/components/icon/icon';
import { Avatar, AvatarFallback } from '@ui/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import { SidebarFooter } from '@ui/components/ui/sidebar';
import { userAtom } from '@web/features/auth/state/auth.store';
import { useLogout } from '@web/features/auth/hooks/use-logout';

/** Two initials for the avatar, from the display name or the email. */
function initialsFor(displayName: string | null, email: string): string {
  const source = displayName?.trim() || email.split('@')[0];
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

/** Menu entries with nothing behind them yet — shown, but plainly unavailable. */
const UNWIRED = [
  { label: 'Settings', icon: 'settings' },
  { label: 'Trash', icon: 'trash' },
  { label: 'Help', icon: 'help' },
] as const;

export function SidebarFooterActions() {
  const { logout } = useLogout();
  const user = useAtomValue(userAtom);

  return (
    <SidebarFooter className="gap-2.5 p-3">
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Account: ${user.email}`}
              className="flex items-center gap-2.5 rounded-lg px-1 py-0.5 hover:cursor-pointer hover:bg-row-hover"
            >
              <Avatar className="size-6.5">
                <AvatarFallback className="bg-border text-[11px] font-semibold text-prose">
                  {initialsFor(user.displayName, user.email)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-left text-[12.5px] text-foreground">
                {user.email}
              </span>
              <Icon
                name="chevronDown"
                decorative
                className="size-3.5 shrink-0 text-muted-foreground"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            className="w-52 rounded-lg p-[5px]"
          >
            {UNWIRED.map(({ label, icon }) => (
              <DropdownMenuItem
                key={label}
                disabled
                className="h-[30px] gap-[9px] rounded-md px-[9px] py-0 text-[12.5px] [&_svg]:size-3.5"
              >
                <Icon name={icon} decorative />
                {label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="mx-1.5 my-1" />
            <DropdownMenuItem
              onSelect={logout}
              className="h-[30px] gap-[9px] rounded-md px-[9px] py-0 text-[12.5px] [&_svg]:size-3.5"
            >
              <Icon name="logOut" decorative />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarFooter>
  );
}
