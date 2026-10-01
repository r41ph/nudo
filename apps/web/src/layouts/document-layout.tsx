import { useEffect, type ReactNode } from 'react';
import { useAtom } from 'jotai';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import { EditorTopBar } from '@web/features/document/components/editor-top-bar';
import { WordCountStrip } from '@web/features/document/components/word-count-strip';

export function DocumentLayout({ children }: { children: ReactNode }) {
  const [isFocusMode, setFocusMode] = useAtom(isFocusModeAtom);

  useEffect(() => {
    if (!isFocusMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // A menu or dialog closing on Escape shouldn't also exit focus mode.
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      setFocusMode(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isFocusMode, setFocusMode]);

  return (
    <div className="flex flex-1 flex-col">
      <EditorTopBar />
      <main className="flex flex-1 justify-center px-8">
        <div className="w-full max-w-[692px] pt-[34px]">{children}</div>
      </main>
      <WordCountStrip />
    </div>
  );
}
