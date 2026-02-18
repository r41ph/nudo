import { useAtomValue } from 'jotai';
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
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-orange-500';
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm">
      <div className="flex items-center gap-3">
        <span className={statusColor()}>{statusText()}</span>
        {lastSaved && (
          <span className="text-gray-400">
            Last saved: {lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>
      <button
        onClick={onSave}
        className="rounded border px-3 py-1 text-xs hover:bg-gray-100"
      >
        Save
      </button>
    </div>
  );
}
