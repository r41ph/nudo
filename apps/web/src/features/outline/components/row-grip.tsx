import { Icon } from '@ui/components/icon/icon';
import { cn } from '@ui/lib/utils';

/**
 * Drag-handle affordance shared by every outline row (part / chapter / section).
 * The whole row is the drag source (headless-tree spreads the draggable props on
 * the row wrapper), so this is purely decorative: it lives absolutely in the
 * left gutter, fades in on row hover, and never shifts layout or replaces the
 * row's leading icon. Mirrors the prototype's `LeafGrip` (`left: 3px`).
 */
export function RowGrip({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute left-1 top-1/2 z-10 -translate-y-1/2 opacity-0 transition-opacity duration-100 group-hover/row:opacity-100',
        className
      )}
    >
      <Icon name="gripVertical" className="h-3.5 w-3.5 text-faint" />
    </span>
  );
}
