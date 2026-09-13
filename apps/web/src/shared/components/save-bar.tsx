import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { Icon } from '@ui/components/icon/icon';
import {
  saveStatusAtom,
  lastSavedAtom,
} from '@web/shared/state/save-status.atom';

const STATUS_CONFIG = {
  unsaved: { text: 'Unsaved changes', color: 'text-accent-foreground' },
  saving: { text: 'Saving...', color: 'text-muted-foreground' },
  saved: { text: 'Saved', color: 'text-status-done' },
  error: { text: 'Save failed', color: 'text-destructive' },
} as const;

// `showTimestamp={false}` keeps the state (including failures) without the
// "Last saved" line, for focus mode.
export function SaveBar({ showTimestamp = true }: { showTimestamp?: boolean }) {
  const saveStatus = useAtomValue(saveStatusAtom);
  const lastSaved = useAtomValue(lastSavedAtom);

  const [autoHidden, setAutoHidden] = useState(false);
  const [prevStatus, setPrevStatus] = useState(saveStatus);
  if (prevStatus !== saveStatus) {
    setPrevStatus(saveStatus);
    setAutoHidden(false);
  }

  useEffect(() => {
    if (saveStatus !== 'saved' && saveStatus !== 'error') return;
    const timer = setTimeout(() => setAutoHidden(true), 4000);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  const isStatusVisible = saveStatus !== 'idle' && !autoHidden;

  const status =
    saveStatus in STATUS_CONFIG
      ? STATUS_CONFIG[saveStatus as keyof typeof STATUS_CONFIG]
      : null;

  return (
    <div className="flex items-center gap-3 text-sm">
      {isStatusVisible && status && (
        <div className={`flex items-center gap-1.5 ${status.color}`}>
          <Icon name="cloud" className="h-3.5 w-3.5" />
          <span>{status.text}</span>
        </div>
      )}
      {showTimestamp && lastSaved && (
        <span className="text-sm text-muted-foreground">
          Last saved: {lastSaved.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
