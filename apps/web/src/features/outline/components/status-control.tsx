import { memo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import {
  EmptyStatusDot,
  STATUS_LABELS,
  StatusDot,
  StatusMenuItems,
} from '@web/shared/components/status-menu';
import type { NodeStatus } from '@web/shared/types/outline.types';

interface NodeStatusControlProps {
  status: NodeStatus | null;
  onChange: (status: NodeStatus | null) => void;
}

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
          className="flex size-5 shrink-0 items-center justify-center rounded-full hover:cursor-pointer"
        >
          {status ? <StatusDot status={status} /> : <EmptyStatusDot />}
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
        <StatusMenuItems status={status} onChange={onChange} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
