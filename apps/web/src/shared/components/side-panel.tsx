import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@ui/lib/utils';

export const PANEL_MOTION_MS = 180;

interface SidePanelProps {
  id: string;
  side: 'left' | 'right';
  /** Any CSS length; capped at 85vw so a phone keeps a strip of page visible. */
  width: string;
  label: string;
  collapsed: boolean;
  children: ReactNode;
}

// The off-canvas presentation shared by the outline and the inspector below
// the collapse breakpoint. shadcn's Sidebar can't do this for both sides: its
// provider holds one open state for every sidebar under it.
export function SidePanel({
  id,
  side,
  width,
  label,
  collapsed,
  children,
}: SidePanelProps) {
  return (
    <aside
      id={id}
      aria-label={label}
      inert={collapsed}
      data-side={side}
      data-state={collapsed ? 'collapsed' : 'expanded'}
      style={
        {
          '--panel-width': width,
          transitionDuration: `${PANEL_MOTION_MS}ms`,
        } as CSSProperties
      }
      className={cn(
        'fixed inset-y-0 z-30 flex w-[min(var(--panel-width),85vw)] flex-col bg-background',
        'motion-safe:transition-transform motion-safe:ease-out',
        side === 'left'
          ? 'left-0 border-r border-border'
          : 'right-0 border-l border-border',
        collapsed &&
          (side === 'left' ? '-translate-x-full' : 'translate-x-full')
      )}
    >
      {children}
    </aside>
  );
}
