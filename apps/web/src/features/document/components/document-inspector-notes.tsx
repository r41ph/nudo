import { useId } from 'react';
import { Label } from '@ui/components/ui/label';
import { Textarea } from '@ui/components/ui/textarea';

export function DocumentInspectorNotes({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();

  return (
    <>
      <Label htmlFor={id} className="sr-only">
        Notes
      </Label>
      {/* field-sizing-fixed undoes the primitive's grow-with-content sizing, so
          a long note scrolls inside the field and the panel holds its place. */}
      <Textarea
        id={id}
        value={value}
        placeholder="Research, reminders, loose ends…"
        onChange={(e) => onChange(e.target.value)}
        className="min-h-0 flex-1 resize-none text-[13px] leading-5 text-foreground field-sizing-fixed md:text-[13px]"
      />
    </>
  );
}
