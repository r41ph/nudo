import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';

// Escape leaves focus mode unless something else already used it: a menu or
// dialog closing, a rename cancelled, a keyboard drag dropped. The window
// hears it last, after the document listeners those use (dnd-kit, Radix).
export function useFocusModeEscape() {
  const [isFocusMode, setFocusMode] = useAtom(isFocusModeAtom);

  useEffect(() => {
    if (!isFocusMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      setFocusMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFocusMode, setFocusMode]);
}
