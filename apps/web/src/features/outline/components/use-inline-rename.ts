import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared inline-rename behavior for outline rows (document / folder / separator).
 * Focuses + selects on edit, commits trimmed non-empty values on blur/Enter,
 * cancels on Escape.
 */
export function useInlineRename(
  current: string,
  onCommit: (value: string) => void
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

  const submit = useCallback(() => {
    if (value.trim()) onCommit(value.trim());
    setIsEditing(false);
  }, [value, onCommit]);

  const cancel = useCallback(() => setIsEditing(false), []);

  return { isEditing, value, setValue, inputRef, start, submit, cancel };
}
