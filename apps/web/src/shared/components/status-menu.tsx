import { memo, type CSSProperties } from 'react';
import { Icon } from '@ui/components/icon/icon';
import { DropdownMenuItem } from '@ui/components/ui/dropdown-menu';
import { cn } from '@ui/lib/utils';
import type { NodeStatus } from '@web/shared/types/outline.types';

// Shared by every status control (outline dot, row menu, inspector field) so
// they can't drift apart.
export const STATUS_LABELS: Record<NodeStatus, string> = {
  planned: 'Planned',
  drafting: 'Drafting',
  done: 'Done',
};

const STATUS_ORDER: NodeStatus[] = ['planned', 'drafting', 'done'];

// Moon-phase dot: empty ring (planned), half (drafting), full (done).
function dotStyle(status: NodeStatus): CSSProperties {
  switch (status) {
    case 'planned':
      return { border: '1.5px solid var(--status-empty)' };
    case 'drafting':
      return {
        border: '1.5px solid var(--status-done)',
        background:
          'linear-gradient(90deg, var(--status-done) 0 50%, transparent 50% 100%)',
      };
    case 'done':
      return {
        border: '1.5px solid var(--status-done)',
        background: 'var(--status-done)',
      };
  }
}

export const StatusDot = memo(function StatusDot({
  status,
  className,
}: {
  status: NodeStatus;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={dotStyle(status)}
      className={cn('inline-block size-2.25 shrink-0 rounded-full', className)}
    />
  );
});

export const EmptyStatusDot = memo(function EmptyStatusDot() {
  return (
    <span
      aria-hidden
      className="size-2.25 shrink-0 rounded-full border border-dashed border-faint"
    />
  );
});

export const StatusMenuItems = memo(function StatusMenuItems({
  status,
  onChange,
}: {
  status: NodeStatus | null;
  onChange: (status: NodeStatus | null) => void;
}) {
  return (
    <>
      {STATUS_ORDER.map((value) => (
        <DropdownMenuItem
          key={value}
          onSelect={() => onChange(value)}
          className="gap-2"
        >
          <StatusDot status={value} />
          <span className="flex-1">{STATUS_LABELS[value]}</span>
          {value === status && (
            <Icon name="check" className="size-3.5 text-accent-foreground" />
          )}
        </DropdownMenuItem>
      ))}
      <DropdownMenuItem onSelect={() => onChange(null)} className="gap-2">
        <EmptyStatusDot />
        <span className="flex-1">No status</span>
        {status === null && (
          <Icon name="check" className="size-3.5 text-accent-foreground" />
        )}
      </DropdownMenuItem>
    </>
  );
});
