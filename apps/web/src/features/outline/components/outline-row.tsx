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
import { REVEAL } from '@web/features/outline/constants/row-chrome.constants';
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
 * Row anatomy. Folders and separators lead with a chevron; documents don't,
 * and hug the guide line of the group they sit in instead of reserving an
 * empty toggle cell:
 *
 *   folder     [gutter 14][chevron 14]  title …  [count][status 20][menu 20]
 *   document   [gutter 20]              title …  [count][status 20][menu 20]
 *
 * At rest a row is just its chevron and title, which runs the full width.
 * Hover adds the grip in the gutter (no layout width) and the meta cluster on
 * the right, which the title yields space to. The row itself carries no
 * focus style: the focusable element is the tree wrapper (headless-tree owns
 * a roving tabindex), so the ring is driven from `group/item` in
 * `outline-tree.tsx`.
 */
const ROW_BASE =
  // The gutter (left padding) is per kind, below. Hover is a neutral ink
  // wash, never the accent — hovering down the tree must not read as four
  // selections. The selected row takes `--sidebar-accent`, the rail's own
  // token, so it doesn't ride on the app-wide `--accent`.
  'group/row relative flex h-8.5 items-center gap-1.5 rounded-lg pr-2 transition-colors ' +
  'hover:bg-row-hover ' +
  'group-focus-visible/item:outline-2 group-focus-visible/item:outline-ring group-focus-visible/item:outline-offset-2';

/** Gutter for rows with a chevron: holds the grip at `left-0.5`, 2px clear of the chevron. */
const CHEVRON_GUTTER = 'pl-3.5';
/**
 * Gutter for documents: 20px, with the grip at `left-1` so its dots sit
 * ~12px from the group's guide line (which runs 4px outside the row) and
 * ~8px from the title.
 */
const DOCUMENT_GUTTER = 'pl-5';
const DOCUMENT_GRIP = 'left-1';

/** The toggle cell: a 14px chevron, hit area widened to 22px without taking layout width. */
const TOGGLE =
  'box-content flex h-full w-3.5 shrink-0 items-center justify-center -mx-1 px-1 hover:cursor-pointer';
const CHEVRON = 'h-3.5 w-3.5 text-muted-foreground transition-transform';

/** Separator action; its wrapper owns the reveal. */
const SEPARATOR_ACTION =
  'size-6.5 rounded-md text-muted-foreground hover:cursor-pointer hover:text-accent-foreground [&_svg]:size-3.5';

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
      <div className={cn(ROW_BASE, CHEVRON_GUTTER)}>
        <RowGrip />
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isOpen ? 'Fold' : 'Unfold'}
          className={TOGGLE}
        >
          <Icon
            name="chevronRight"
            className={cn(CHEVRON, isOpen && 'rotate-90')}
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
        <div className={cn('shrink-0 items-center', REVEAL)} onClick={stop}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={rename.start}
            aria-label={`Rename ${title}`}
            className={SEPARATOR_ACTION}
          >
            <Icon name="pen" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={openDeleteDialog}
            aria-label={`Delete ${title}`}
            className={SEPARATOR_ACTION}
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

  // Chapters read a step above the documents under them by size alone; the
  // selected row is carried by fill and ink, never weight, with no left bar.
  const titleFont = isFolder
    ? 'text-[14px] md:text-[14px] font-normal'
    : 'text-[13.5px] md:text-[13.5px] font-normal';

  return (
    <div
      className={cn(
        ROW_BASE,
        isFolder ? CHEVRON_GUTTER : DOCUMENT_GUTTER,
        isActive && 'bg-sidebar-accent hover:bg-sidebar-accent'
      )}
    >
      <RowGrip className={isFolder ? undefined : DOCUMENT_GRIP} />

      {isFolder && (
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
          className={TOGGLE}
        >
          <Icon
            name="chevronRight"
            className={cn(CHEVRON, isOpen && 'rotate-90')}
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

      {/* Meta cluster — count, status, ⋮ — absent at rest so the title has the
          whole row; on hover it takes its width from the title's end. */}
      <div className={cn('shrink-0 items-center gap-1.5', REVEAL)}>
        <span className="text-[11.5px] tabular-nums text-muted-foreground">
          {wordCount.toLocaleString()}
        </span>
        {/* Status on every row, not just folders as the handoff's anatomy has
            it: a document's own status is the thing a writer tracks most. */}
        <div className="flex w-5 justify-center" onClick={stop}>
          <NodeStatusControl status={status} onChange={handleSetStatus} />
        </div>
        <div className="flex w-5 justify-center" onClick={stop}>
          <RowMenu
            title={title}
            status={status}
            onRename={rename.start}
            onSetStatus={handleSetStatus}
            onAddChild={handleAdd}
            onDelete={openDeleteDialog}
          />
        </div>
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
