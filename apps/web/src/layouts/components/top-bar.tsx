import type { ReactNode } from 'react';

export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 h-12 shrink-0">
      <span className="font-sans text-3xl tracking-wide text-foreground/80 font-bold">
        —nudo<span className="text-[#0a3c3a]">.</span>
      </span>
      {children && <div className="flex items-center">{children}</div>}
    </header>
  );
}
