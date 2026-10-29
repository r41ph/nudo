import { useRef, useState } from 'react';
import { Icon } from '@ui/components/icon/icon';
import { Button } from '@ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import { cn } from '@ui/lib/utils';
import { InlineNameInput } from '@web/features/plot/components/board/inline-name-input';
import {
  PLOTLINE_COLORS,
  PLOTLINE_COLOR_DOT_CLASS,
  PLOTLINE_COLOR_LABELS,
} from '@web/features/plot/constants/plot.constants';
import { countLabel } from '@web/features/plot/lib/plot.utils';
import type { Plotline, PlotlineColor } from '@web/features/plot/plot.types';

interface PlotlineLabelProps {
  plotline: Plotline;
  isFirst: boolean;
  isLast: boolean;
  onRename: (name: string) => void;
  onColorChange: (color: PlotlineColor) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
  className?: string;
}

// Opacity rather than `hidden` so the trigger stays in the tab order; touch
// screens have no hover to reveal it.
const TRIGGER =
  'size-6 shrink-0 text-muted-foreground opacity-0 transition-opacity ' +
  'group-hover/label:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100';

export function PlotlineLabel({
  plotline,
  isFirst,
  isLast,
  onRename,
  onColorChange,
  onMove,
  onDelete,
  className,
}: PlotlineLabelProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  // Rename waits for the menu to finish closing: its focus restore to the
  // trigger would otherwise blur the new input and commit at once.
  const renamePendingRef = useRef(false);

  return (
    <div
      role="rowheader"
      className={cn(
        'group/label flex min-h-24 items-start gap-2 border-b border-border bg-background py-3 pr-3',
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-1.5 size-2.5 shrink-0 rounded-full',
          PLOTLINE_COLOR_DOT_CLASS[plotline.color]
        )}
      />
      {isRenaming ? (
        <InlineNameInput
          name={plotline.name}
          label="Plotline name"
          onCommit={onRename}
          onDone={() => setIsRenaming(false)}
          className="-ml-1 flex-1"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {plotline.name}
        </span>
      )}
      <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
        {countLabel(0, 'card')}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${plotline.name}`}
            className={TRIGGER}
          >
            <Icon name="moreHorizontal" decorative />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
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
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <Icon name="palette" decorative />
              Colour
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-36">
              <DropdownMenuRadioGroup
                value={plotline.color}
                onValueChange={(color) => onColorChange(color as PlotlineColor)}
              >
                {PLOTLINE_COLORS.map((color) => (
                  <DropdownMenuRadioItem key={color} value={color}>
                    <span
                      aria-hidden
                      className={cn(
                        'size-2.5 shrink-0 rounded-full',
                        PLOTLINE_COLOR_DOT_CLASS[color]
                      )}
                    />
                    {PLOTLINE_COLOR_LABELS[color]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem disabled={isFirst} onSelect={() => onMove(-1)}>
            <Icon name="arrowUp" decorative />
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isLast} onSelect={() => onMove(1)}>
            <Icon name="arrowDown" decorative />
            Move down
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Icon name="trash" decorative />
            Delete plotline
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
