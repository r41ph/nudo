import { SidebarHeader } from '@ui/components/ui/sidebar';
import { WordCounter } from '@web/components/word-counter/word-counter';

interface ProjectHeaderProps {
  name: string;
  wordCount: number;
}

export function ProjectHeader({ name, wordCount }: ProjectHeaderProps) {
  return (
    <SidebarHeader className="px-5 pt-6 pb-4 border-b border-sidebar-border">
      <h2 className="font-serif font-bold text-xl text-foreground leading-tight">
        {name}
      </h2>
      <WordCounter count={wordCount} label="Words" />
    </SidebarHeader>
  );
}
