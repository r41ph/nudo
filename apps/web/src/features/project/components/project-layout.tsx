import { useEffect, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { isAuthenticatedAtom } from '@web/features/auth/state/auth.store';
import { useActiveProject } from '@web/shared/hooks/use-projects';
import { writeLastProject } from '@web/shared/lib/last-project';

export function ProjectLayout({ children }: { children: ReactNode }) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <ProjectGate>{children}</ProjectGate>;
}

// Loading and load errors render the workspace, whose header shows them; only
// a confirmed miss replaces it.
function ProjectGate({ children }: { children: ReactNode }) {
  const { data, project } = useActiveProject();

  useEffect(() => {
    if (project) writeLastProject(project.id);
  }, [project]);

  if (data && !project) {
    // RLS hides a foreign project exactly like a missing one, so this never
    // reveals that someone else's project exists.
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Project not found</p>
        <Link to="/" className="text-sm underline underline-offset-4">
          Go to your projects
        </Link>
      </div>
    );
  }

  return children;
}
