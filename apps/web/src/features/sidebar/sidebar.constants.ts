export const SIDEBAR_WIDTH = '295px';

// Only Story is wired; the rest are shown so the rail reads as complete.
export const SIDEBAR_TOOLS = [
  { label: 'Story', active: true },
  { label: 'Characters', active: false },
  { label: 'Timeline', active: false },
] as const;

// Target of the outline toggle's aria-controls below the collapse breakpoint.
export const OUTLINE_PANEL_ID = 'outline-panel';
