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

const ITEM =
  'h-[30px] gap-[9px] rounded-md px-[9px] py-0 text-[12.5px] [&_svg]:size-3.5';

const TRIGGER =
  'h-6.5 w-5 shrink-0 rounded-md p-0 text-muted-foreground hover:cursor-pointer ' +
  'hover:text-accent-foreground data-[state=open]:text-accent-foreground [&_svg]:size-3.5';

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

// Replaces the three hover-only icons that were unreachable by keyboard and
// touch.
export const RowMenu = memo(function RowMenu({
  title,
  status,
  onRename,
  onSetStatus,
  onAddChild,
  onDelete,
}: RowMenuProps) {
  // Rename can't start while the menu is still closing: the menu's focus trap
  // would pull focus back out of the new input and the resulting blur would
  // commit an edit the user never made. So it's deferred to close-autofocus,
  // with the default focus restore suppressed.
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
          <Icon name="moreVertical" decorative />
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

        {/* On every row: adding inside a document is how it becomes a container. */}
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
