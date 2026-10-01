import { useAtomValue } from 'jotai';
import { Icon, type IconName } from '@ui/components/icon/icon';
import { Avatar, AvatarFallback } from '@ui/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import { SidebarFooter } from '@ui/components/ui/sidebar';
import { userAtom } from '@web/features/auth/state/auth.store';
import { useLogout } from '@web/features/auth/hooks/use-logout';
import { useDarkMode } from '@web/shared/hooks/use-theme';

function initialsFor(displayName: string | null, email: string): string {
  const source = displayName?.trim() || email.split('@')[0];
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

// Nothing behind these yet; shown so the menu reads as complete. They keep
// full-contrast labels on purpose: dimmed, 13.5px text fails WCAG AA.
const UNWIRED: ReadonlyArray<{ label: string; icon: IconName }> = [
  { label: 'Settings', icon: 'settings' },
  { label: 'Trash', icon: 'trash' },
  { label: 'Help', icon: 'help' },
  { label: 'Keyboard shortcuts', icon: 'keyboard' },
];

const ITEM =
  'h-9 gap-2.5 rounded-lg px-[9px] py-0 text-[13.5px] text-foreground ' +
  'focus:bg-sidebar-accent focus:text-foreground data-[disabled]:opacity-100 ' +
  '[&_svg]:size-4 [&_svg]:text-prose';

function DarkModeItem() {
  const { isDark, setDark } = useDarkMode();

  return (
    <DropdownMenuCheckboxItem
      checked={isDark}
      onCheckedChange={setDark}
      // Toggling a setting shouldn't dismiss the menu.
      onSelect={(event) => event.preventDefault()}
      className={`${ITEM} hover:cursor-pointer [&>span:first-child]:hidden`}
    >
      <Icon name="moon" decorative />
      Dark mode
      <span
        aria-hidden
        data-state={isDark ? 'checked' : 'unchecked'}
        className="ml-auto inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border border-transparent bg-input p-px transition-colors data-[state=checked]:bg-primary"
      >
        <span
          data-state={isDark ? 'checked' : 'unchecked'}
          className="block size-3.5 rounded-full bg-background shadow-xs transition-transform data-[state=checked]:translate-x-3.5"
        />
      </span>
    </DropdownMenuCheckboxItem>
  );
}

export function SidebarFooterActions() {
  const { logout } = useLogout();
  const user = useAtomValue(userAtom);

  return (
    <SidebarFooter className="gap-3 p-0">
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Account: ${user.email}`}
              className="group flex h-10 items-center gap-2.5 rounded-lg px-2.5 hover:cursor-pointer hover:bg-row-hover data-[state=open]:bg-sidebar-accent"
            >
              <Avatar className="size-6.5">
                <AvatarFallback className="bg-border text-[11px] font-semibold text-prose">
                  {initialsFor(user.displayName, user.email)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-left text-[13.5px] text-prose">
                {user.email}
              </span>
              <Icon
                name="chevronDown"
                decorative
                className="size-3.5 shrink-0 text-faint transition-transform group-data-[state=open]:rotate-180"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            sideOffset={6}
            className="w-[259px] rounded-xl border-border bg-popover p-1.5 shadow-[0_8px_28px_rgba(26,25,23,0.08)]"
          >
            <DarkModeItem />
            {UNWIRED.map(({ label, icon }) => (
              <DropdownMenuItem key={label} disabled className={ITEM}>
                <Icon name={icon} decorative />
                {label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="mx-1.5 my-[7px]" />
            <DropdownMenuItem
              onSelect={logout}
              className={`${ITEM} hover:cursor-pointer`}
            >
              <Icon name="logOut" decorative />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarFooter>
  );
}
