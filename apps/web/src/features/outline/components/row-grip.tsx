import { Icon } from '@ui/components/icon/icon';
import { cn } from '@ui/lib/utils';

/**
 * Drag-handle affordance shared by every outline row (part / chapter / section).
 * The whole row is the drag source (headless-tree spreads the draggable props on
 * the row wrapper), so this is purely decorative.
 *
 * It floats: absolutely placed inside the row's 16px left padding, so it costs
 * no layout width and titles stay aligned with the "Story" heading. 12px wide at
 * `left-0.5` leaves 2px either side, so it sits within the row's hover fill and
 * keeps the same clearance whether a title or a chevron follows it. One offset
 * works at every level.
 */
export function RowGrip({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute left-0.5 top-1/2 z-10 -translate-y-1/2 opacity-0 group-hover/row:opacity-100',
        className
      )}
    >
      <Icon name="gripVertical" className="size-3 text-faint" />
    </span>
  );
}
