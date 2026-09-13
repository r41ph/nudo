import { useCallback, useEffect, useRef, useState } from 'react';

// A blur commit is silent, so callers offer an undo for it.
export interface RenameCommitMeta {
  viaBlur: boolean;
}

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
