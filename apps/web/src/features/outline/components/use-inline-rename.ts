import { useCallback, useEffect, useRef, useState } from 'react';

/** How the edit was ended — a blur commit is silent, so it needs an undo path. */
export interface RenameCommitMeta {
  viaBlur: boolean;
}

/**
 * Shared inline-rename behavior for outline rows (document / folder / separator).
 * Focuses + selects on edit, commits trimmed non-empty values on blur/Enter,
 * cancels on Escape. Callers are told whether a commit came from a blur so they
 * can offer an undo for the change the user never explicitly confirmed.
 */
export function useInlineRename(
  current: string,
  onCommit: (value: string, meta: RenameCommitMeta) => void
) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const start = useCallback(() => {
    setValue(current);
    setIsEditing(true);
  }, [current]);

  const commit = useCallback(
    (viaBlur: boolean) => {
      if (value.trim()) onCommit(value.trim(), { viaBlur });
      setIsEditing(false);
    },
    [value, onCommit]
  );

  const submit = useCallback(() => commit(false), [commit]);
  const submitOnBlur = useCallback(() => commit(true), [commit]);

  const cancel = useCallback(() => setIsEditing(false), []);

  return {
    isEditing,
    value,
    setValue,
    inputRef,
    start,
    submit,
    submitOnBlur,
    cancel,
  };
}
