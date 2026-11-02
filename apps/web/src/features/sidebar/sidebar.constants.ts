import type { IconName } from '@ui/components/icon/icon';

export const SIDEBAR_WIDTH = '295px';

// Shared with the Projects submenu so its items match the account menu.
export const ACCOUNT_MENU_ITEM =
  'h-9 gap-2.5 rounded-lg px-[9px] py-0 text-[13.5px] text-foreground ' +
  'focus:bg-sidebar-accent focus:text-foreground data-[disabled]:opacity-100 ' +
  '[&_svg]:size-4 [&_svg]:text-prose';

// Shared by the account menu and the view switcher so both read as one family.
export const SIDEBAR_MENU_SURFACE =
  'rounded-xl border-border bg-popover p-1.5 ' +
  'shadow-[0_8px_28px_rgba(26,25,23,0.08)]';

// Characters isn't wired yet; it's shown so the rail reads as complete.
export const SIDEBAR_TOOLS = [
  { label: 'Story', tool: 'story', icon: 'fileText' },
  { label: 'Characters', tool: null, icon: 'users' },
  { label: 'Plot', tool: 'plot', icon: 'squareChartGantt' },
] as const satisfies ReadonlyArray<{
  label: string;
  tool: 'story' | 'plot' | null;
  icon: IconName;
}>;
