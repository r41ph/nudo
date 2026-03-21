import type { ReactNode } from 'react';

export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-6 h-12 shrink-0">
      <span className="font-serif italic text-2xl tracking-wide text-foreground/80">
        Trameo
      </span>
      {children && <div className="flex items-center">{children}</div>}
    </header>
  );
}
