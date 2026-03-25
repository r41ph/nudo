import type { ReactNode } from 'react';
import { SaveBar } from '@web/components/save-bar/save-bar';

export function DocumentLayout({ children, onSave }: { children: ReactNode; onSave: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex justify-end px-8 py-2">
        <SaveBar onSave={onSave} />
      </div>
      <main className="flex flex-1 justify-center px-8 py-10">
        <div className="w-full max-w-200">
          {children}
        </div>
      </main>
    </div>
  );
}
