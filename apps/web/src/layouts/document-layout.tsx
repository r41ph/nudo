import type { ReactNode } from 'react';
import { useAtom } from 'jotai';
import { SaveBar } from '@web/shared/components/save-bar';
import { Button } from '@ui/components/ui/button';
import { Icon } from '@ui/components/icon/icon';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';

export function DocumentLayout({ children, onSave }: { children: ReactNode; onSave: () => void }) {
  const [isFocusMode, setFocusMode] = useAtom(isFocusModeAtom);

  return (
    <div className="flex flex-1 flex-col">
      {isFocusMode ? (
        <div className="fixed top-0 right-0 z-50 flex items-center gap-2 px-4 py-2">
          <SaveBar onSave={onSave} />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            title="Exit Focus Mode"
            onClick={() => setFocusMode(false)}
          >
            <Icon name="minimize" className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex justify-end px-8 py-2">
          <SaveBar onSave={onSave} />
        </div>
      )}
      <main className="flex flex-1 justify-center px-8 py-10">
        <div className="w-full max-w-200">
          {children}
        </div>
      </main>
    </div>
  );
}
