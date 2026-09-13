import { Icon } from '@ui/components/icon/icon';
import { cn } from '@ui/lib/utils';

// Decorative: the whole row is the drag source (headless-tree spreads the
// draggable props on the row wrapper). Absolutely placed so revealing it
// moves nothing.
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
