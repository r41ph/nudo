import { useAtom } from 'jotai';
import { Button } from '@ui/components/ui/button';
import { Icon } from '@ui/components/icon/icon';
import { SaveBar } from '@web/shared/components/save-bar';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';

export function EditorTopBar() {
  const [isFocusMode, setFocusMode] = useAtom(isFocusModeAtom);

  return (
    <header className="flex h-[62px] shrink-0 items-center justify-end gap-4 pr-[26px]">
      <SaveBar showTimestamp={false} />
      <Button
        variant="ghost"
        size="icon"
        aria-label={isFocusMode ? 'Leave focus mode' : 'Enter focus mode'}
        onClick={() => setFocusMode(!isFocusMode)}
        className="size-[34px] rounded-lg text-faint hover:cursor-pointer hover:bg-row-hover hover:text-foreground"
      >
        <Icon
          name="maximize"
          decorative
          className="size-[17px] [stroke-width:1.7]"
        />
      </Button>
    </header>
  );
}
