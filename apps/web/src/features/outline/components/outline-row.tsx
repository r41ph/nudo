import { memo, useCallback } from 'react';
import { Icon } from '@ui/components/icon/icon';
import { Button } from '@ui/components/ui/button';
import { Input } from '@ui/components/ui/input';
import { cn } from '@ui/lib/utils';
import { NodeStatusControl } from '@web/features/outline/components/status-control';
import { AddNodeMenu } from '@web/features/outline/components/add-node-menu';
import { RowGrip } from '@web/features/outline/components/row-grip';
import { useInlineRename } from '@web/features/outline/components/use-inline-rename';
import type { NodeKind, NodeStatus } from '@web/features/outline/outline.types';

interface OutlineRowProps {
  id: string;
  title: string;
  kind: NodeKind;
  status: NodeStatus | null;
  wordCount: number;
  /** Folder: expanded. Separator: not folded (run is shown). */
  isOpen: boolean;
  isActive: boolean;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string, kind: NodeKind) => void;
  onSetStatus: (id: string, status: NodeStatus | null) => void;
  /** Folder: expand/collapse. Separator: fold/unfold the run. */
  onToggle: (id: string, isSeparator: boolean) => void;
}

const stop = (e: React.MouseEvent) => e.stopPropagation();

const RenameInput = ({
  inputRef,
  value,
  setValue,
  submit,
  cancel,
}: ReturnType<typeof useInlineRename>) => (
  <div onClick={stop}>
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={submit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') cancel();
      }}
      className="h-7 text-sm"
    />
  </div>
);

export const OutlineRow = memo(function OutlineRow({
  id,
  title,
  kind,
  status,
  wordCount,
  isOpen,
  isActive,
  onRename,
  onDelete,
  onAddChild,
  onSetStatus,
  onToggle,
}: OutlineRowProps) {
  const rename = useInlineRename(title, (v) => onRename(id, v));

  const handleAdd = useCallback(
    (childKind: NodeKind) => onAddChild(id, childKind),
    [onAddChild, id]
  );
  const handleDelete = useCallback(() => onDelete(id), [onDelete, id]);
  const handleSetStatus = useCallback(
    (next: NodeStatus | null) => onSetStatus(id, next),
    [onSetStatus, id]
  );
  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle(id, kind === 'separator');
    },
    [onToggle, id, kind]
  );

  if (rename.isEditing) return <RenameInput {...rename} />;

  // ── Separator: a flat scoping marker (rule + label + fold chevron) ─────────
  if (kind === 'separator') {
    return (
      <div className="group/row relative flex h-7 items-center gap-2 pl-5">
        <RowGrip />
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isOpen ? 'Fold' : 'Unfold'}
          className="flex w-3.5 shrink-0 items-center justify-center hover:cursor-pointer"
        >
          <Icon
            name="chevronRight"
            className={cn(
              'h-3.5 w-3.5 text-faint transition-transform',
              isOpen && 'rotate-90'
            )}
          />
        </button>
        <span className="shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">
          {title}
        </span>
        <span className="h-px flex-1 bg-sidebar-border" aria-hidden />
        <div
          className="flex shrink-0 items-center gap-0.5 pr-1.5 opacity-0 transition-opacity group-hover/row:opacity-100"
          onClick={stop}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={rename.start}
            aria-label="Rename"
            className="h-5 w-5 hover:cursor-pointer [&_svg]:size-3.5"
          >
            <Icon name="pen" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            aria-label="Delete"
            className="h-5 w-5 hover:cursor-pointer [&_svg]:size-3.5"
          >
            <Icon name="trash" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Document / Folder ──────────────────────────────────────────────────────
  const isFolder = kind === 'folder';

  return (
    <div
      className={cn(
        'group/row relative flex h-8 items-center gap-2 rounded-[7px] pl-5 transition-colors hover:bg-sidebar-accent',
        isActive && 'bg-sidebar-accent'
      )}
    >
      <RowGrip />
      {isActive && (
        <span className="absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-full bg-accent-foreground" />
      )}

      {isFolder ? (
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
          className="flex w-3.5 shrink-0 items-center justify-center hover:cursor-pointer"
        >
          <Icon
            name="chevronRight"
            className={cn(
              'h-3.5 w-3.5 text-faint transition-transform',
              isOpen && 'rotate-90'
            )}
          />
        </button>
      ) : (
        <span className="flex w-3.5 shrink-0 items-center justify-center">
          <span
            aria-hidden
            className={cn(
              'size-1 rounded-full',
              isActive ? 'bg-accent-foreground' : 'bg-faint'
            )}
          />
        </span>
      )}

      <span
        className={cn(
          'flex-1 truncate',
          isFolder
            ? cn(
                'text-[13.5px] tracking-[-0.01em]',
                isActive
                  ? 'font-semibold text-foreground'
                  : 'font-medium text-prose'
              )
            : cn(
                'text-[12.5px]',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )
        )}
      >
        {title}
      </span>

      <div className="flex shrink-0 items-center gap-1.5 pr-1.5" onClick={stop}>
        <div className="relative flex h-5 min-w-7 items-center justify-end">
          <span className="pointer-events-none font-mono text-[10.5px] tabular-nums text-faint transition-opacity group-hover/row:opacity-0">
            {wordCount.toLocaleString()}
          </span>
          <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-[7px] bg-linear-to-l from-sidebar-accent from-65% to-transparent pl-5 opacity-0 transition-opacity group-hover/row:opacity-100">
            <AddNodeMenu
              onAdd={handleAdd}
              trigger={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Add inside"
                  className="h-5 w-5 text-muted-foreground hover:cursor-pointer hover:text-accent-foreground [&_svg]:size-3.5"
                >
                  <Icon name="plus" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={rename.start}
              aria-label="Rename"
              className="h-5 w-5 hover:cursor-pointer [&_svg]:size-3.5"
            >
              <Icon name="pen" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              aria-label="Delete"
              className="h-5 w-5 hover:cursor-pointer [&_svg]:size-3.5"
            >
              <Icon name="trash" />
            </Button>
          </div>
        </div>
        <NodeStatusControl status={status} onChange={handleSetStatus} />
      </div>
    </div>
  );
});
