import { useAtom } from 'jotai';
import { Button } from '@ui/components/ui/button';
import { Icon } from '@ui/components/icon/icon';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';

export function FocusModeButton() {
  const [isFocusMode, setFocusMode] = useAtom(isFocusModeAtom);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isFocusMode ? 'Leave focus mode' : 'Enter focus mode'}
      onClick={() => setFocusMode(!isFocusMode)}
      className="size-[34px] rounded-lg text-foreground hover:cursor-pointer hover:bg-row-hover hover:text-accent-foreground"
    >
      <Icon
        name={isFocusMode ? 'minimize' : 'maximize'}
        decorative
        className="size-[17px] [stroke-width:1.7]"
      />
    </Button>
  );
}
