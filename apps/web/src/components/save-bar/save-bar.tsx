import { useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { Icon } from '@ui/components/icon/icon';
import { saveStatusAtom, lastSavedAtom } from '@web/state/save-status.atom';

const STATUS_CONFIG = {
  unsaved: { text: 'Unsaved changes', color: 'text-orange-500' },
  saving: { text: 'Saving...', color: 'text-yellow-600' },
  saved: { text: 'Saved', color: 'text-muted-foreground' },
  error: { text: 'Save failed', color: 'text-red-600' },
} as const;

export function SaveBar({ onSave: _onSave }: { onSave: () => void }) {
  const saveStatus = useAtomValue(saveStatusAtom);
  const lastSaved = useAtomValue(lastSavedAtom);
  const [isStatusVisible, setIsStatusVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    if (saveStatus === 'idle') {
      setIsStatusVisible(false);
      return;
    }

    setIsStatusVisible(true);

    if (saveStatus === 'saved' || saveStatus === 'error') {
      hideTimerRef.current = setTimeout(() => setIsStatusVisible(false), 4000);
    }

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [saveStatus]);

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
      {lastSaved && (
        <span className="text-green-800 text-sm">
          Last saved: {lastSaved.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
