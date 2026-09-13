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
  trigger: ReactNode;
  onAdd: (kind: NodeKind) => void;
  align?: 'start' | 'end';
}

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
