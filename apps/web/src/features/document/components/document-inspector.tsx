import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Icon } from '@ui/components/icon/icon';
import { Button } from '@ui/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ui/components/ui/tabs';
import {
  EDITOR_SELECTOR,
  INSPECTOR_AUTOFOCUS_ATTR,
} from '@web/features/document/constants/inspector.constants';
import type { DocumentDetails } from '@web/features/document/document.types';
import {
  closeInspectorAtom,
  consumeInspectorFocusAtom,
  inspectorFocusRequestedAtom,
} from '@web/shared/state/panels.atom';

interface DocumentInspectorProps {
  details: DocumentDetails;
}

const HEADER =
  'flex h-[62px] shrink-0 items-end justify-between gap-3 border-b border-border px-6';

const TAB =
  'h-auto flex-none rounded-none px-0 pt-0 pb-2.5 text-[13px] font-medium text-muted-foreground ' +
  'hover:cursor-pointer data-[state=active]:font-semibold data-[state=active]:text-foreground ' +
  'disabled:opacity-100 after:bottom-[-1px]';

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
      <Tabs defaultValue="details" className="min-w-0 flex-1 gap-0">
        <div className={HEADER}>
          <TabsList variant="line" className="h-auto gap-5 p-0">
            <TabsTrigger value="details" className={TAB}>
              Details
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              disabled
              title="Notes aren't available yet"
              className={TAB}
            >
              Notes
            </TabsTrigger>
          </TabsList>
          {closeButton}
        </div>
        <TabsContent
          value="details"
          className="flex flex-col gap-5 overflow-y-auto px-6 pt-5 pb-6"
        >
          <Timestamps {...details} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
