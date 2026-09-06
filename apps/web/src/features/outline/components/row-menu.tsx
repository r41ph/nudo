import { memo, useCallback, useRef } from 'react';
import { Icon, type IconName } from '@ui/components/icon/icon';
import { Button } from '@ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import { StatusMenuItems } from '@web/features/outline/components/status-control';
import type { NodeKind, NodeStatus } from '@web/shared/types/outline.types';

/** 30px rows, 12.5px label, 9px between icon and label, 14px icons. */
const ITEM =
  'h-[30px] gap-[9px] rounded-md px-[9px] py-0 text-[12.5px] [&_svg]:size-3.5';

/**
 * Collapsed to zero width at rest so the title gets the whole row, then snapped
 * to 26px on hover, keyboard focus, or while the menu is open — no transition,
 * it appears at once. The button stays mounted and in the tab order throughout
 * (zero-width, not `hidden`), so it is still reachable without a pointer, and
 * opening the menu from an already hovered row shifts nothing further.
 */
const TRIGGER =
  // `transition-none` is load-bearing: Button's base class is `transition-all`,
  // which would otherwise animate the width open.
  'h-6.5 w-0 shrink-0 overflow-hidden rounded-md p-0 text-muted-foreground opacity-0 ' +
  'transition-none hover:cursor-pointer hover:text-accent-foreground ' +
  'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:size-3.5 ' +
  'group-hover/row:w-6.5 group-hover/row:opacity-100 ' +
  'focus-visible:w-6.5 focus-visible:opacity-100 ' +
  'group-focus-visible/item:w-6.5 group-focus-visible/item:opacity-100 ' +
  'data-[state=open]:w-6.5 data-[state=open]:opacity-100';

const ADD_KINDS: { kind: NodeKind; label: string; icon: IconName }[] = [
  { kind: 'document', label: 'Document', icon: 'fileText' },
  { kind: 'folder', label: 'Folder', icon: 'folder' },
  { kind: 'separator', label: 'Separator', icon: 'minus' },
];

interface RowMenuProps {
  title: string;
  status: NodeStatus | null;
  onRename: () => void;
  onSetStatus: (status: NodeStatus | null) => void;
  onAddChild: (kind: NodeKind) => void;
  onDelete: () => void;
}

/**
 * One `⋯` menu per outline row, replacing the three hover-revealed icons that
 * were unreachable by keyboard and touch. Every entry carries a text label.
 */
export const RowMenu = memo(function RowMenu({
  title,
  status,
  onRename,
  onSetStatus,
  onAddChild,
  onDelete,
}: RowMenuProps) {
  // Rename mounts an input and focuses it, so it must not start while this menu
  // is still closing: the open menu traps focus and would pull it straight back
  // out of the new input, and the blur that follows commits an edit the user
  // never made. Defer the start to the menu's own close-autofocus phase, and
  // prevent the default focus restore so the input keeps what it takes. Every
  // other item still returns focus to the row's action slot.
  const pendingRenameRef = useRef(false);

  const handleRename = useCallback(() => {
    pendingRenameRef.current = true;
  }, []);

  const handleCloseAutoFocus = useCallback(
    (event: Event) => {
      if (!pendingRenameRef.current) return;
      pendingRenameRef.current = false;
      event.preventDefault();
      onRename();
    },
    [onRename]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${title}`}
          className={TRIGGER}
        >
          <Icon name="moreHorizontal" decorative />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44 rounded-lg p-[5px]"
        onClick={(e) => e.stopPropagation()}
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <DropdownMenuItem onSelect={handleRename} className={ITEM}>
          <Icon name="pencil" decorative />
          Rename
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={ITEM}>
            <Icon name="circleDashed" decorative />
            Set status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40 rounded-lg p-[5px]">
            <StatusMenuItems status={status} onChange={onSetStatus} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Offered on every row, not just folders: adding inside a document is
            how a document becomes a container, and this is the only entry point
            for it — the footer button only creates at the root. */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={ITEM}>
            <Icon name="plus" decorative />
            New inside
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40 rounded-lg p-[5px]">
            {ADD_KINDS.map(({ kind, label, icon }) => (
              <DropdownMenuItem
                key={kind}
                onSelect={() => onAddChild(kind)}
                className={ITEM}
              >
                <Icon name={icon} decorative />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator className="mx-1.5 my-1" />

        <DropdownMenuItem
          variant="destructive"
          onSelect={onDelete}
          className={ITEM}
        >
          <Icon name="trash" decorative />
          Delete…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
