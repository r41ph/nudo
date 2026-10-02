import { useAtom } from 'jotai';
import { Button } from '@ui/components/ui/button';
import { Icon } from '@ui/components/icon/icon';
import { SaveBar } from '@web/shared/components/save-bar';
import {
  INSPECTOR_PANEL_ID,
  OUTLINE_PANEL_ID,
} from '@web/shared/constants/panels.constants';
import { usePanels } from '@web/shared/hooks/use-panels';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';

const ICON_BUTTON_CLASS =
  'size-[34px] rounded-lg text-faint hover:cursor-pointer hover:bg-row-hover hover:text-foreground';
const ICON_CLASS = 'size-[17px] [stroke-width:1.7]';

export function EditorTopBar() {
  const [isFocusMode, setFocusMode] = useAtom(isFocusModeAtom);
  const {
    outlineExpanded,
    inspectorExpanded,
    showOutlineToggle,
    showInspectorToggle,
    toggleOutline,
    toggleInspector,
  } = usePanels();

  return (
    <header className="flex h-[62px] shrink-0 items-center justify-end gap-4 px-[26px]">
      {/* Focus mode renders neither panel, so there is nothing to toggle. */}
      {showOutlineToggle && !isFocusMode && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={outlineExpanded ? 'Hide outline' : 'Show outline'}
          aria-expanded={outlineExpanded}
          aria-controls={OUTLINE_PANEL_ID}
          onClick={toggleOutline}
          className={`mr-auto ${ICON_BUTTON_CLASS}`}
        >
          <Icon name="panelLeft" decorative className={ICON_CLASS} />
        </Button>
      )}
      <SaveBar showTimestamp={false} />
      {showInspectorToggle && !isFocusMode && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={inspectorExpanded ? 'Hide details' : 'Show details'}
          aria-expanded={inspectorExpanded}
          aria-controls={INSPECTOR_PANEL_ID}
          onClick={toggleInspector}
          className={ICON_BUTTON_CLASS}
        >
          <Icon name="panelRight" decorative className={ICON_CLASS} />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label={isFocusMode ? 'Leave focus mode' : 'Enter focus mode'}
        onClick={() => setFocusMode(!isFocusMode)}
        className={ICON_BUTTON_CLASS}
      >
        <Icon name="maximize" decorative className={ICON_CLASS} />
      </Button>
    </header>
  );
}
