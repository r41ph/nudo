import { memo, type ReactNode } from 'react';
import { Icon, type IconName } from '@ui/components/icon/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import type { NodeKind } from '@web/shared/types/outline.types';

const KIND_META: { kind: NodeKind; label: string; icon: IconName }[] = [
  { kind: 'document', label: 'Document', icon: 'fileText' },
  { kind: 'folder', label: 'Folder', icon: 'folder' },
  { kind: 'separator', label: 'Separator', icon: 'minus' },
];

interface AddNodeMenuProps {
  /** Renders the dropdown trigger (a `+` button, a footer link, …). */
  trigger: ReactNode;
  onAdd: (kind: NodeKind) => void;
  align?: 'start' | 'end';
}

/**
 * The "+ Add" affordance. Same three choices everywhere — under a row (adds a
 * child; turns a document into a folder) and in the footer (adds at the root).
 */
export const AddNodeMenu = memo(function AddNodeMenu({
  trigger,
  onAdd,
  align = 'start',
}: AddNodeMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-44"
        onClick={(e) => e.stopPropagation()}
      >
        {KIND_META.map(({ kind, label, icon }) => (
          <DropdownMenuItem
            key={kind}
            onSelect={() => onAdd(kind)}
            className="gap-2.5"
          >
            <Icon name={icon} className="size-4 text-muted-foreground" />
            <span className="text-[13px]">{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
