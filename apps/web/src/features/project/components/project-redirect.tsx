import { useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { Button } from '@ui/components/ui/button';
import { isAuthenticatedAtom } from '@web/features/auth/state/auth.store';
import { ProjectTitleDialog } from '@web/features/project/components/project-title-dialog';
import { useProjectMutations } from '@web/features/project/hooks/use-project-mutations';
import { useProjects } from '@web/shared/hooks/use-projects';
import { readLastProject } from '@web/shared/lib/last-project';
import { projectPath } from '@web/shared/lib/routes';

export function ProjectRedirect() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <ResolveProject />;
}

function ResolveProject() {
  const { data: projects, isLoading, isError, refetch } = useProjects();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (isError || !projects) {
    return (
      <div
        role="alert"
        className="flex h-64 flex-col items-center justify-center gap-4"
      >
        <p className="text-destructive">Couldn&apos;t load your projects.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  // A stale key (deleted project, another account on this browser) is not in
  // the RLS-scoped list, so it falls through to the newest project.
  const lastProjectId = readLastProject();
  const target =
    projects.find((p) => p.id === lastProjectId) ?? projects[0] ?? null;

  if (!target) return <NoProjects />;

  return <Navigate to={projectPath(target.id)} replace />;
}

export function NoProjects() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { createProject } = useProjectMutations();

  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">You have no projects yet.</p>
      <Button ref={buttonRef} onClick={() => setOpen(true)}>
        Create a project
      </Button>
      <ProjectTitleDialog
        open={open}
        onOpenChange={setOpen}
        // No DialogTrigger to return to, so Radix would drop focus on body.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          buttonRef.current?.focus();
        }}
        heading="New project"
        onSave={(title) => createProject.mutateAsync(title)}
      />
    </div>
  );
}
