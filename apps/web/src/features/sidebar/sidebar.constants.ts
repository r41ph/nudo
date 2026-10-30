export const SIDEBAR_WIDTH = '295px';

// Shared with the Projects submenu so its items match the account menu.
export const ACCOUNT_MENU_ITEM =
  'h-9 gap-2.5 rounded-lg px-[9px] py-0 text-[13.5px] text-foreground ' +
  'focus:bg-sidebar-accent focus:text-foreground data-[disabled]:opacity-100 ' +
  '[&_svg]:size-4 [&_svg]:text-prose';

// Characters isn't wired yet; it's shown so the rail reads as complete.
export const SIDEBAR_TOOLS = [
  { label: 'Story', tool: 'story' },
  { label: 'Characters', tool: null },
  { label: 'Plot', tool: 'plot' },
] as const;
