import { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Icon } from '@ui/components/icon/icon';
import { Button } from '@ui/components/ui/button';
import { Input } from '@ui/components/ui/input';
import { cn } from '@ui/lib/utils';
import { NodeStatusControl } from '@web/features/outline/components/status-control';
import { DeleteNodeDialog } from '@web/features/outline/components/delete-node-dialog';
import { RowMenu } from '@web/features/outline/components/row-menu';
import { RowGrip } from '@web/features/outline/components/row-grip';
import { useInlineRename } from '@web/features/outline/components/use-inline-rename';
import type { NodeKind, NodeStatus } from '@web/shared/types/outline.types';

interface OutlineRowProps {
  id: string;
  title: string;
  kind: NodeKind;
  status: NodeStatus | null;
  wordCount: number;
  /** Nodes inside this one — the blast radius named in the delete dialog. */
  descendantCount: number;
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

/**
 * Every row is 34px tall, 8px-padded and 8px-gapped, with an action slot that
 * reserves its width permanently — only the glyph inside it fades — so nothing
 * to its left reflows on hover. The row itself carries no focus style: the
 * focusable element is the tree wrapper (headless-tree owns a roving tabindex),
 * so the ring is driven from `group/item` in `outline-tree.tsx`.
 */
const ROW_BASE =
  // `pl-4` holds the floating grip (12px at `left-0.5`) with 2px clear on each
  // side, so the grip sits inside the row's hover fill and never touches what
  // follows it. The chevron is left-aligned in its 24px hit area for the same
  // reason — centred, its glyph would start 5px further right than a document's
  // title and the grip would read as differently spaced on folder rows.
  'group/row relative flex h-8.5 items-center gap-2 rounded-lg pl-4 pr-2 transition-colors ' +
  'group-focus-visible/item:outline-2 group-focus-visible/item:outline-ring group-focus-visible/item:outline-offset-2';

/** Action-slot glyph: hidden at rest, lit on row hover, keyboard focus, or open menu. */
const SLOT_ICON =
  'size-6.5 rounded-md text-muted-foreground opacity-0 transition-opacity hover:cursor-pointer ' +
  'hover:text-accent-foreground focus-visible:opacity-100 data-[state=open]:opacity-100 ' +
  'group-hover/row:opacity-100 group-focus-visible/item:opacity-100 [&_svg]:size-3.5';

/**
 * The title, edited in place. The row keeps its chrome — count, status, indent
 * guides all stay put — so only the text swaps for a field. `md:` variants are
 * respecified because `Input`'s own `md:text-sm` would otherwise resize the
 * title mid-edit, and the outline is an arbitrary property so `Input`'s
 * `outline-none` can't win the cascade against it.
 */
const RenameInput = ({
  inputRef,
  value,
  setValue,
  submit,
  submitOnBlur,
  cancel,
  font,
}: ReturnType<typeof useInlineRename> & { font: string }) => (
  <Input
    ref={inputRef}
    value={value}
    aria-label="Title"
    onClick={stop}
    onChange={(e) => setValue(e.target.value)}
    onBlur={submitOnBlur}
    onKeyDown={(e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') cancel();
    }}
    className={cn(
      font,
      'h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-foreground shadow-none',
      'dark:bg-transparent focus-visible:border-0 focus-visible:ring-0',
      '[outline:2px_solid_var(--ring)] [outline-offset:2px]'
    )}
  />
);

export const OutlineRow = memo(function OutlineRow({
  id,
  title,
  kind,
  status,
  wordCount,
  descendantCount,
  isOpen,
  isActive,
  onRename,
  onDelete,
  onAddChild,
  onSetStatus,
  onToggle,
}: OutlineRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const rename = useInlineRename(title, (value, { viaBlur }) => {
    onRename(id, value);
    // Committing on blur is silent by nature — the user never confirmed it, so
    // the change has to be visible and reversible.
    if (viaBlur && value !== title) {
      const previous = title;
      toast(`Renamed to “${value}”`, {
        action: { label: 'Undo', onClick: () => onRename(id, previous) },
      });
    }
  });

  const handleAdd = useCallback(
    (childKind: NodeKind) => onAddChild(id, childKind),
    [onAddChild, id]
  );
  const handleDelete = useCallback(() => onDelete(id), [onDelete, id]);
  const openDeleteDialog = useCallback(() => setConfirmingDelete(true), []);
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

  // ── Separator: a flat scoping marker (rule + label + fold chevron) ─────────
  if (kind === 'separator') {
    return (
      <div className={ROW_BASE}>
        <RowGrip />
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isOpen ? 'Fold' : 'Unfold'}
          className="flex size-6 shrink-0 items-center justify-start hover:cursor-pointer"
        >
          <Icon
            name="chevronRight"
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform',
              isOpen && 'rotate-90'
            )}
          />
        </button>
        {rename.isEditing ? (
          <RenameInput
            {...rename}
            font="text-[10.5px] md:text-[10.5px] font-semibold uppercase tracking-[0.14em]"
          />
        ) : (
          <span className="shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </span>
        )}
        <span className="h-px flex-1 bg-sidebar-border" aria-hidden />
        <div className="flex shrink-0 items-center" onClick={stop}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={rename.start}
            aria-label={`Rename ${title}`}
            className={SLOT_ICON}
          >
            <Icon name="pen" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={openDeleteDialog}
            aria-label={`Delete ${title}`}
            className={SLOT_ICON}
          >
            <Icon name="trash" />
          </Button>
        </div>
        <DeleteNodeDialog
          open={confirmingDelete}
          onOpenChange={setConfirmingDelete}
          title={title}
          descendantCount={descendantCount}
          onConfirm={handleDelete}
        />
      </div>
    );
  }

  // ── Document / Folder ──────────────────────────────────────────────────────
  const isFolder = kind === 'folder';

  // Chapters read a step above the documents under them; the selected row is
  // carried by fill plus weight, with no left bar.
  const titleFont = isFolder
    ? 'text-[14px] md:text-[14px] font-semibold'
    : cn(
        'text-[13.5px] md:text-[13.5px]',
        isActive ? 'font-semibold' : 'font-normal'
      );

  return (
    <div
      className={cn(
        ROW_BASE,
        // Hover is a neutral ink wash, never the accent — hovering down the tree
        // must not read as four selections.
        'hover:bg-row-hover',
        isActive && 'bg-accent hover:bg-accent'
      )}
    >
      <RowGrip />

      {isFolder && (
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
          className="flex size-6 shrink-0 items-center justify-start hover:cursor-pointer"
        >
          <Icon
            name="chevronRight"
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform',
              isOpen && 'rotate-90'
            )}
          />
        </button>
      )}

      {rename.isEditing ? (
        <RenameInput {...rename} font={titleFont} />
      ) : (
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            titleFont,
            isFolder || isActive ? 'text-foreground' : 'text-prose'
          )}
        >
          {title}
        </span>
      )}

      {/* Count sits in the flow at its natural width — no reserved column, so the
          title gets the space instead of truncating at ~14 characters. */}
      <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
        {wordCount.toLocaleString()}
      </span>

      <div className="flex shrink-0 items-center" onClick={stop}>
        {/* On every row, not just folders as the handoff's anatomy has it — a
            document's own status is the thing a writer tracks most, and hiding
            it left nested documents with no visible state at all. */}
        <NodeStatusControl status={status} onChange={handleSetStatus} />
        <RowMenu
          title={title}
          status={status}
          onRename={rename.start}
          onSetStatus={handleSetStatus}
          onAddChild={handleAdd}
          onDelete={openDeleteDialog}
        />
      </div>

      <DeleteNodeDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={title}
        descendantCount={descendantCount}
        onConfirm={handleDelete}
      />
    </div>
  );
});
