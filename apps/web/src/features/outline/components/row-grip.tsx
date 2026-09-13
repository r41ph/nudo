import { Icon } from '@ui/components/icon/icon';
import { cn } from '@ui/lib/utils';

/**
 * Drag-handle affordance shared by every outline row (part / chapter / section).
 * The whole row is the drag source (headless-tree spreads the draggable props on
 * the row wrapper), so this only signals it: it shows a grab cursor and lets
 * the press through to the row.
 *
 * It floats: absolutely placed inside the row's left gutter, so it costs no
 * layout width and nothing moves when it appears. `left-0.5` suits the 14px
 * gutter of rows with a chevron; document rows pass a wider offset for their
 * wider gutter (see `outline-row.tsx`).
 */
export function RowGrip({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute left-0.5 top-1/2 z-10 -translate-y-1/2 opacity-0 hover:cursor-grab active:cursor-grabbing group-hover/row:opacity-100',
        className
      )}
    >
      <Icon name="gripVertical" className="size-3 text-faint" />
    </span>
  );
}
