import { memo, type CSSProperties } from 'react';
import { Icon } from '@ui/components/icon/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import { cn } from '@ui/lib/utils';
import type { NodeStatus } from '@web/shared/types/outline.types';

const STATUS_LABELS: Record<NodeStatus, string> = {
  planned: 'Planned',
  drafting: 'Drafting',
  done: 'Done',
};

const STATUS_ORDER: NodeStatus[] = ['planned', 'drafting', 'done'];

// Moon-phase dot: empty ring (planned), left-half filled (drafting), solid (done).
// Colours come from the --status-* tokens, never hard-coded.
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

interface NodeStatusControlProps {
  status: NodeStatus | null;
  onChange: (status: NodeStatus | null) => void;
}

/**
 * Status is opt-in on any node. When set, the moon dot is always visible. When
 * unset, a faint dashed "add status" dot appears on row hover (the parent row
 * owns the `group/row` hover). The menu can clear it back to none.
 */
export const NodeStatusControl = memo(function NodeStatusControl({
  status,
  onChange,
}: NodeStatusControlProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            status ? `Status: ${STATUS_LABELS[status]}` : 'Set status'
          }
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full transition-opacity hover:cursor-pointer',
            !status &&
              'opacity-0 group-hover/row:opacity-100 data-[state=open]:opacity-100'
          )}
        >
          {status ? (
            <StatusDot status={status} />
          ) : (
            <span
              aria-hidden
              className="size-2.25 rounded-full border border-dashed border-faint"
            />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-40"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Status
        </DropdownMenuLabel>
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
          <span className="size-2.25 rounded-full border border-dashed border-faint" />
          <span className="flex-1">No status</span>
          {status === null && (
            <Icon name="check" className="size-3.5 text-accent-foreground" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
