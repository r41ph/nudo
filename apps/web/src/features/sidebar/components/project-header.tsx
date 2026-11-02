import { SidebarHeader } from '@ui/components/ui/sidebar';
import { Button } from '@ui/components/ui/button';
import { Skeleton } from '@ui/components/ui/skeleton';
import { ViewSwitcher } from '@web/features/sidebar/components/view-switcher';
import { useActiveProject } from '@web/shared/hooks/use-projects';
import nudoLogo from '@web/assets/nudo-A-Editorial-Bold-transparent.svg';
import nudoDarkLogo from '@web/assets/nudo-A-Editorial-Bold-dark-transparent.svg';

export function ProjectHeader() {
  const { project, isLoading, isError, refetch } = useActiveProject();
  return (
    <ProjectHeaderView
      title={project?.title}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
    />
  );
}

interface ProjectHeaderViewProps {
  title: string | undefined;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function ProjectHeaderView({
  title,
  isLoading = false,
  isError = false,
  onRetry,
}: ProjectHeaderViewProps) {
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
      <div className="mt-8 px-2.5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Manuscript
        </p>
        {isError ? (
          <div role="alert" className="mt-1 flex items-center gap-2">
            <span className="text-sm text-destructive">
              Couldn&apos;t load projects
            </span>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <Skeleton aria-label="Loading project" className="mt-1 h-6 w-40" />
        ) : (
          <h2 className="mt-1 font-newsreader text-xl font-semibold leading-tight text-foreground">
            {title}
          </h2>
        )}
      </div>
      <ViewSwitcher />
    </SidebarHeader>
  );
}
