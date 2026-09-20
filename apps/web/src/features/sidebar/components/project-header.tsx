import { SidebarHeader } from '@ui/components/ui/sidebar';
import { ToolList } from '@web/features/sidebar/components/tool-list';
import nudoLogo from '@web/assets/nudo-A-Editorial-Bold-transparent.svg';
import nudoDarkLogo from '@web/assets/nudo-A-Editorial-Bold-dark-transparent.svg';

export function ProjectHeader({ name }: { name: string }) {
  return (
    <SidebarHeader className="gap-0 p-0">
      <div className="flex items-center px-2.5">
        <img src={nudoLogo} alt="nudo" className="h-6 w-auto dark:hidden" />
        <img
          src={nudoDarkLogo}
          alt="nudo"
          className="h-5 w-auto hidden dark:block"
        />
      </div>
      <h2 className="mt-8 px-2.5 font-newsreader text-xl font-semibold leading-tight text-foreground">
        {name}
      </h2>
      <ToolList />
    </SidebarHeader>
  );
}
