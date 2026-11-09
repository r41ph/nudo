import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Icon } from '@ui/components/icon/icon';
import { Button } from '@ui/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ui/components/ui/tabs';
import { DetailsSaveStatus } from '@web/features/document/components/details-save-status';
import { DocumentInspectorDetails } from '@web/features/document/components/document-inspector-details';
import { DocumentInspectorNotes } from '@web/features/document/components/document-inspector-notes';
import {
  EDITOR_SELECTOR,
  INSPECTOR_AUTOFOCUS_ATTR,
} from '@web/features/document/constants/inspector.constants';
import type { DocumentDetails } from '@web/features/document/document.types';
import { useDocumentDetailsSave } from '@web/features/document/hooks/use-document-details-save';
import { usePanels } from '@web/shared/hooks/use-panels';
import {
  closeInspectorAtom,
  consumeInspectorFocusAtom,
  inspectorAtom,
  inspectorFocusRequestedAtom,
  setInspectorTabAtom,
  type InspectorTab,
} from '@web/shared/state/panels.atom';

interface DocumentInspectorProps {
  details: DocumentDetails;
}

const HEADER =
  'flex h-[62px] shrink-0 items-end justify-between gap-3 border-b border-border px-6';

const TAB =
  'h-auto flex-none rounded-none px-0 pt-0 pb-2.5 text-[13px] font-medium text-muted-foreground ' +
  'hover:cursor-pointer data-[state=active]:font-semibold data-[state=active]:text-foreground ' +
  'after:bottom-[-1px]';

const CLOSE =
  'mb-2.5 size-7 rounded-lg text-faint hover:cursor-pointer hover:bg-row-hover hover:text-foreground';

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

function Timestamps({ createdAt, updatedAt }: DocumentDetails) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-border pt-4 text-[11.5px] text-muted-foreground">
      <dt>Created</dt>
      <dd className="text-right tabular-nums">
        <time dateTime={createdAt}>{formatTimestamp(createdAt)}</time>
      </dd>
      <dt>Updated</dt>
      <dd className="text-right tabular-nums">
        <time dateTime={updatedAt}>{formatTimestamp(updatedAt)}</time>
      </dd>
    </dl>
  );
}

// Owns the save hook because Radix unmounts inactive TabsContent: inside a tab,
// a switch would drop the debounce and re-seed the fields from the query cache.
function InspectorTabs({
  details,
  closeButton,
}: DocumentInspectorProps & { closeButton: ReactNode }) {
  const save = useDocumentDetailsSave(details);
  const { inspectorExpanded } = usePanels();
  const { tab } = useAtomValue(inspectorAtom);
  const setTab = useSetAtom(setInspectorTabAtom);
  const { flush } = save;

  // Collapsing below 1280px keeps the panel mounted, so the unmount flush
  // never runs; send what's pending as it slides away.
  useEffect(() => {
    if (!inspectorExpanded) flush();
  }, [inspectorExpanded, flush]);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as InspectorTab)}
      className="min-h-0 min-w-0 flex-1 gap-0"
    >
      <div className={HEADER}>
        <TabsList variant="line" className="h-auto gap-5 p-0">
          <TabsTrigger value="details" className={TAB}>
            Details
          </TabsTrigger>
          <TabsTrigger value="notes" className={TAB}>
            Notes
          </TabsTrigger>
        </TabsList>
        <div className="flex min-w-0 items-center gap-3">
          <div className="mb-2.5 flex h-7 items-center">
            <DetailsSaveStatus state={save.saveState} onRetry={save.retry} />
          </div>
          {closeButton}
        </div>
      </div>
      {/* forceMount: the row menu's Details switches tab and focuses Title
          together, and Radix would only mount Title a commit too late. */}
      <TabsContent
        value="details"
        forceMount
        className="flex min-h-0 flex-col gap-5 overflow-y-auto px-6 pt-5 pb-6 data-[state=inactive]:hidden"
      >
        <DocumentInspectorDetails details={details} save={save} />
        <Timestamps {...details} />
      </TabsContent>
      <TabsContent
        value="notes"
        className="flex min-h-0 flex-1 flex-col px-6 pt-5 pb-6"
      >
        <DocumentInspectorNotes value={save.notes} onChange={save.setNotes} />
      </TabsContent>
    </Tabs>
  );
}

export function DocumentInspector({ details }: DocumentInspectorProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Recorded only on an explicit open. A document switch remounts the panel
  // without one, and closing then lands in the editor, where the writer is.
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const focusRequested = useAtomValue(inspectorFocusRequestedAtom);
  const consumeFocus = useSetAtom(consumeInspectorFocusAtom);
  const closeInspector = useSetAtom(closeInspectorAtom);

  useEffect(() => {
    const panel = panelRef.current;
    if (!focusRequested || !panel) return;
    const previous = document.activeElement;
    if (previous instanceof HTMLElement && !panel.contains(previous)) {
      returnFocusRef.current = previous;
    }
    const target =
      panel.querySelector<HTMLElement>(`[${INSPECTOR_AUTOFOCUS_ATTR}]`) ??
      panel.querySelector<HTMLElement>('[role="tab"][data-state="active"]') ??
      panel.querySelector<HTMLElement>('button');
    target?.focus();
    consumeFocus();
  }, [focusRequested, consumeFocus]);

  const close = useCallback(() => {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    closeInspector();
    const fallback = document.querySelector<HTMLElement>(EDITOR_SELECTOR);
    (target?.isConnected ? target : fallback)?.focus();
  }, [closeInspector]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Menus inside the panel dismiss themselves on Escape and mark it handled.
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // DocumentLayout skips handled events, so this one Escape doesn't also
      // leave focus mode.
      event.preventDefault();
      close();
    },
    [close]
  );

  const closeButton = (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Close details"
      onClick={close}
      className={CLOSE}
    >
      <Icon name="x" decorative className="size-4" />
    </Button>
  );

  if (details.kind === 'separator') {
    return (
      <div
        ref={panelRef}
        onKeyDown={handleKeyDown}
        className="flex h-full flex-col"
      >
        <div className={HEADER}>
          <span />
          {closeButton}
        </div>
        <p className="px-6 pt-5 text-[12.5px] text-muted-foreground">
          Separators don&apos;t have details.
        </p>
      </div>
    );
  }

  return (
    <div ref={panelRef} onKeyDown={handleKeyDown} className="flex h-full">
      <InspectorTabs details={details} closeButton={closeButton} />
    </div>
  );
}
