import { Icon } from '@ui/components/icon/icon';
import { SidebarHeader } from '@ui/components/ui/sidebar';
import { WordCounter } from '@web/shared/components/word-counter';
import { useWordCount } from '@web/features/document/hooks/document.hooks';
import nudoLogo from '@web/assets/nudo-A-Editorial-Bold-transparent.svg';
import nudoDarkLogo from '@web/assets/nudo-A-Editorial-Bold-dark-transparent.svg';

export function ProjectHeader({ name }: { name: string }) {
  const totalWordCount = useWordCount();

  return (
    <SidebarHeader className="px-5 pt-6 pb-4 border-b border-sidebar-border">
      <div className="flex items-center justify-between">
        <img src={nudoLogo} alt="nudo" className="h-5 w-auto dark:hidden" />
        <img
          src={nudoDarkLogo}
          alt="nudo"
          className="h-5 w-auto hidden dark:block"
        />
        <Icon name="settings" className="h-4 w-4 text-faint" />
      </div>
      <h2 className="font-newsreader font-semibold text-xl text-foreground leading-tight mt-5">
        {name}
      </h2>
      <WordCounter count={totalWordCount} label="total words" />
    </SidebarHeader>
  );
}
