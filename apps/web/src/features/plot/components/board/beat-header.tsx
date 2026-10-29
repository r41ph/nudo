import { useRef, useState } from 'react';
import { Icon } from '@ui/components/icon/icon';
import { Button } from '@ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import { cn } from '@ui/lib/utils';
import { InlineNameInput } from '@web/features/plot/components/board/inline-name-input';
import type { PlotBeat } from '@web/features/plot/plot.types';

interface BeatHeaderProps {
  beat: PlotBeat;
  isFirst: boolean;
  isLast: boolean;
  onRename: (name: string) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
  className?: string;
}

// Opacity rather than `hidden` so the trigger stays in the tab order; touch
// screens have no hover to reveal it.
const TRIGGER =
  'size-6 shrink-0 text-muted-foreground opacity-0 transition-opacity ' +
  'group-hover/header:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100';

export function BeatHeader({
  beat,
  isFirst,
  isLast,
  onRename,
  onMove,
  onDelete,
  className,
}: BeatHeaderProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  // Rename waits for the menu to finish closing: its focus restore to the
  // trigger would otherwise blur the new input and commit at once.
  const renamePendingRef = useRef(false);

  return (
    <div
      role="columnheader"
      className={cn(
        'group/header flex items-center gap-2 border-b border-border bg-background px-3 py-2',
        className
      )}
    >
      {isRenaming ? (
        <InlineNameInput
          name={beat.name}
          label="Beat name"
          onCommit={onRename}
          onDone={() => setIsRenaming(false)}
          className="-ml-1 flex-1"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {beat.name}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${beat.name}`}
            className={TRIGGER}
          >
            <Icon name="moreHorizontal" decorative />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48"
          onCloseAutoFocus={(event) => {
            if (!renamePendingRef.current) return;
            renamePendingRef.current = false;
            event.preventDefault();
            setIsRenaming(true);
          }}
        >
          <DropdownMenuItem
            onSelect={() => {
              renamePendingRef.current = true;
            }}
          >
            <Icon name="pencil" decorative />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isFirst} onSelect={() => onMove(-1)}>
            <Icon name="arrowLeft" decorative />
            Move left
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isLast} onSelect={() => onMove(1)}>
            <Icon name="arrowRight" decorative />
            Move right
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Icon name="trash" decorative />
            Delete beat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
