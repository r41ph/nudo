import { useAtomValue, useSetAtom } from 'jotai';
import { Button } from '@ui/components/ui/button';
import { Icon } from '@ui/components/icon/icon';
import { SaveBar } from '@web/shared/components/save-bar';
import { ThemeToggle } from '@web/shared/components/theme-toggle';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import {
  currentDocumentAtom,
  liveWordCountAtom,
} from '@web/features/document/state/document.store';
import { useBreadcrumb } from '@web/features/document/hooks/use-breadcrumb';
import { useDailyWordDelta } from '@web/features/document/hooks/use-daily-word-delta';
import { EditorBreadcrumb } from '@web/features/document/components/editor-breadcrumb';

export function EditorTopBar() {
  const currentDocument = useAtomValue(currentDocumentAtom);
  const liveWordCount = useAtomValue(liveWordCountAtom);
  const setFocusMode = useSetAtom(isFocusModeAtom);

  const docId = currentDocument?.id ?? null;
  const crumbs = useBreadcrumb(docId);

  const wordCount =
    liveWordCount?.documentId === docId
      ? liveWordCount.count
      : (currentDocument?.wordCount ?? 0);
  const delta = useDailyWordDelta(docId, wordCount);

  return (
    <header className="flex h-13 shrink-0 items-center justify-between gap-4 bg-background px-7.5">
      <EditorBreadcrumb crumbs={crumbs} />

      <div className="flex shrink-0 items-center gap-4">
        <SaveBar />
        <span className="text-[13px] font-medium tabular-nums text-accent-foreground">
          +{delta.toLocaleString()} today
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          title="Focus mode"
          onClick={() => setFocusMode(true)}
        >
          <Icon name="maximize" className="h-4 w-4" />
        </Button>
        <span aria-hidden className="h-4 w-px bg-border" />
        <ThemeToggle />
      </div>
    </header>
  );
}
