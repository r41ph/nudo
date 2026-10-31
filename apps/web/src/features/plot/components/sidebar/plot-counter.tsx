export function PlotCounter({ label }: { label: string }) {
  return (
    <p
      role="status"
      className="mt-auto shrink-0 px-2.5 py-2.5 text-xs text-muted-foreground"
    >
      {label}
    </p>
  );
}
