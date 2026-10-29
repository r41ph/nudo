import { useEffect, useRef, useState } from 'react';
import { Input } from '@ui/components/ui/input';
import { cn } from '@ui/lib/utils';
import { PLOT_NAME_MAX_LENGTH } from '@web/features/plot/constants/plot.constants';

interface InlineNameInputProps {
  name: string;
  label: string;
  onCommit: (name: string) => void;
  onDone: () => void;
  className?: string;
}

export function InlineNameInput({
  name,
  label,
  onCommit,
  onDone,
  className,
}: InlineNameInputProps) {
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  // Enter and Escape end the edit, and the blur that follows must not commit
  // a second time (or commit after a cancel).
  const doneRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function finish(commit: boolean) {
    if (doneRef.current) return;
    doneRef.current = true;
    const trimmed = value.trim();
    if (commit && trimmed && trimmed !== name) onCommit(trimmed);
    onDone();
  }

  // `md:text-sm` is respecified so `Input` doesn't resize the name mid-edit.
  return (
    <Input
      ref={inputRef}
      value={value}
      aria-label={label}
      maxLength={PLOT_NAME_MAX_LENGTH}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      }}
      className={cn(
        'h-auto min-w-0 rounded-sm border-0 bg-transparent px-1 py-0 text-sm font-medium text-foreground shadow-none md:text-sm',
        'dark:bg-transparent focus-visible:border-0 focus-visible:ring-0',
        '[outline:2px_solid_var(--ring)] [outline-offset:1px]',
        className
      )}
    />
  );
}
