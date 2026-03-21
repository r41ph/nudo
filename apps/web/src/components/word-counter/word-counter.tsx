interface WordCounterProps {
  count: number;
  label?: string;
}

export function WordCounter({ count, label }: WordCounterProps) {
  return (
    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
      {count.toLocaleString()}
      {label ? ` ${label}` : ''}
    </p>
  );
}
