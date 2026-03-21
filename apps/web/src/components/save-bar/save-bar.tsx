import { useAtomValue } from 'jotai';
import { Button } from '@ui/components/ui/button';
import { Icon } from '@ui/components/icon/icon';
import { saveStatusAtom, lastSavedAtom } from '@web/state/save-status.atom';

export function SaveBar({ onSave }: { onSave: () => void }) {
  const saveStatus = useAtomValue(saveStatusAtom);
  const lastSaved = useAtomValue(lastSavedAtom);

  const statusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Save failed';
      default:
        return 'Unsaved changes';
    }
  };

  const statusColor = () => {
    switch (saveStatus) {
      case 'saving':
        return 'text-yellow-600';
      case 'saved':
        return 'text-muted-foreground';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-orange-500';
    }
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className={`flex items-center gap-1.5 ${statusColor()}`}>
        <Icon name="cloud" className="h-3.5 w-3.5" />
        <span>{statusText()}</span>
      </div>
      {lastSaved && (
        <span className="text-muted-foreground/60 text-xs">
          Last saved: {lastSaved.toLocaleTimeString()}
        </span>
      )}
      <Button variant="outline" size="sm" onClick={onSave} className="h-7 text-xs">
        Save
      </Button>
    </div>
  );
}
