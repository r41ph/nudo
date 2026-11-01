export function PlotCounter({ label }: { label: string }) {
  return (
    <p
      role="status"
      // Named apart from the drag live region, which is a status too.
      aria-label="Plot totals"
      className="mt-auto shrink-0 px-2.5 py-2.5 text-xs text-muted-foreground"
    >
      {label}
    </p>
  );
}
