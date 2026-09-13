import { useEffect, type ReactNode } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { SaveBar } from '@web/shared/components/save-bar';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import {
  currentDocumentAtom,
  liveWordCountAtom,
} from '@web/features/document/state/document.store';
import { EditorTopBar } from '@web/features/document/components/editor-top-bar';

function FocusModeBar() {
  const [, setFocusMode] = useAtom(isFocusModeAtom);
  const currentDocument = useAtomValue(currentDocumentAtom);
  const liveWordCount = useAtomValue(liveWordCountAtom);

  const docId = currentDocument?.id ?? null;
  const wordCount =
    liveWordCount?.documentId === docId
      ? liveWordCount.count
      : (currentDocument?.wordCount ?? 0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // A menu or dialog closing on Escape shouldn't also exit focus mode.
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      setFocusMode(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [setFocusMode]);

  return (
    <div className="fixed top-3.5 right-4 z-50 flex items-center gap-2.5 text-[11.5px] text-muted-foreground">
      <SaveBar showTimestamp={false} />
      <span className="tabular-nums">{wordCount.toLocaleString()} words</span>
      <button
        type="button"
        aria-label="Exit focus mode"
        onClick={() => setFocusMode(false)}
        className="flex h-6.5 min-w-6.5 items-center justify-center rounded-md bg-muted px-1.5 text-[12px] text-muted-foreground hover:cursor-pointer hover:text-foreground"
      >
        esc
      </button>
    </div>
  );
}

export function DocumentLayout({ children }: { children: ReactNode }) {
  const isFocusMode = useAtomValue(isFocusModeAtom);

  return (
    <div className="flex flex-1 flex-col">
      {isFocusMode ? <FocusModeBar /> : <EditorTopBar />}
      <main className="flex flex-1 justify-center px-8 py-10">
        <div className="w-full max-w-200">{children}</div>
      </main>
    </div>
  );
}
