import type { ReactNode } from 'react';

import nudoLogo from '@web/assets/nudo-A-Editorial-Bold-transparent.svg';
import nudoDarkLogo from '@web/assets/nudo-A-Editorial-Bold-dark-transparent.svg';

export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 h-12 shrink-0">
      <div className="flex items-center gap-4">
        <img src={nudoLogo} alt="nudo" className="h-5 w-auto dark:hidden" />
        <img
          src={nudoDarkLogo}
          alt="nudo"
          className="h-5 w-auto hidden dark:block"
        />
      </div>
      {children && <div className="flex items-center">{children}</div>}
    </header>
  );
}
