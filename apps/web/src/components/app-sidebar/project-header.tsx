import { SidebarHeader } from '@ui/components/ui/sidebar';
import { WordCounter } from '@web/components/word-counter/word-counter';
import { useWordCount } from '@web/hooks/useWordCount';

export function ProjectHeader({ name }: { name: string }) {
  const totalWordCount = useWordCount();

  return (
    <SidebarHeader className="px-5 pt-6 pb-4 border-b border-sidebar-border">
      <h2 className="font-serif font-bold text-xl text-foreground leading-tight">
        {name}
      </h2>
      <WordCounter count={totalWordCount} label="total words" />
    </SidebarHeader>
  );
}
