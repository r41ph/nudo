import { useEffect, useState } from 'react';
import { Button } from '@ui/components/ui/button';
import type { DetailsSaveState } from '@web/features/document/hooks/use-document-details-save';

const SAVE_STATES: Record<
  Exclude<DetailsSaveState, 'idle'>,
  { text: string; color: string }
> = {
  saving: { text: 'Saving…', color: 'text-muted-foreground' },
  saved: { text: 'Saved', color: 'text-status-done' },
  error: { text: "Couldn't save", color: 'text-destructive' },
};

// Same vocabulary and colours as the SaveBar, but its own line: the SaveBar
// belongs to the editor's content saves, and two writers on one label would
// fight. Saved fades after 4s like the SaveBar; an error stays until retried.
export function DetailsSaveStatus({
  state,
  onRetry,
}: {
  state: DetailsSaveState;
  onRetry: () => void;
}) {
  const [hidden, setHidden] = useState(false);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    setHidden(false);
  }

  useEffect(() => {
    if (state !== 'saved') return;
    const timer = setTimeout(() => setHidden(true), 4000);
    return () => clearTimeout(timer);
  }, [state]);

  const shown = state === 'idle' || hidden ? null : SAVE_STATES[state];

  // Always rendered: a live region has to exist before its text changes for
  // screen readers to announce the change.
  return (
    <p
      role="status"
      className={`flex min-h-5 items-center gap-2 text-[11.5px] ${shown?.color ?? ''}`}
    >
      {shown?.text}
      {state === 'error' && (
        <Button
          variant="link"
          size="sm"
          onClick={onRetry}
          className="h-auto p-0 text-[11.5px] text-destructive underline"
        >
          Retry
        </Button>
      )}
    </p>
  );
}
