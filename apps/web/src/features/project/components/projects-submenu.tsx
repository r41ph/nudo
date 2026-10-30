import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@ui/components/icon/icon';
import {
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@ui/components/ui/dropdown-menu';
import { DeleteProjectDialog } from '@web/features/project/components/delete-project-dialog';
import { ProjectTitleDialog } from '@web/features/project/components/project-title-dialog';
import { useProjectMutations } from '@web/features/project/hooks/use-project-mutations';
import { outlineQueryOptions } from '@web/shared/api/outline.api';
import { useProjectId } from '@web/shared/hooks/use-project-id';
import { useActiveProject, useProjects } from '@web/shared/hooks/use-projects';
import { projectPath } from '@web/shared/lib/routes';
import type { Project } from '@web/shared/types/project.types';

export type ProjectDialog = 'create' | 'rename' | 'delete';

interface ProjectsSubmenuViewProps {
  projects: Project[] | undefined;
  activeId: string | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelect: (projectId: string) => void;
  onAction: (dialog: ProjectDialog) => void;
  itemClassName?: string;
}

export function ProjectsSubmenuView({
  projects,
  activeId,
  isLoading,
  isError,
  onRetry,
  onSelect,
  onAction,
  itemClassName = '',
}: ProjectsSubmenuViewProps) {
  const active = projects?.find((p) => p.id === activeId);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        className={`${itemClassName} hover:cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-foreground`}
      >
        <Icon name="bookOpen" decorative />
        Projects
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-[240px] rounded-xl border-border bg-popover p-1.5">
        {isLoading ? (
          <DropdownMenuItem disabled className={itemClassName}>
            Loading projects…
          </DropdownMenuItem>
        ) : isError ? (
          <>
            <DropdownMenuItem disabled className={itemClassName}>
              {"Couldn't load projects"}
            </DropdownMenuItem>
            <DropdownMenuItem
              // Keeps the menu open so the list appears in place.
              onSelect={(event) => {
                event.preventDefault();
                onRetry();
              }}
              className={`${itemClassName} hover:cursor-pointer`}
            >
              Retry
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuRadioGroup value={activeId} onValueChange={onSelect}>
              {projects?.map((project) => (
                <DropdownMenuRadioItem
                  key={project.id}
                  value={project.id}
                  // Swaps shadcn's dot for a check in the icon column, so the
                  // titles line up with the actions below.
                  className={`${itemClassName} hover:cursor-pointer [&>span:first-child]:hidden`}
                >
                  <Icon
                    name="check"
                    decorative
                    className={project.id === activeId ? '' : 'invisible'}
                  />
                  <span className="truncate">{project.title}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator className="mx-1.5 my-[7px]" />
            <DropdownMenuItem
              onSelect={() => onAction('create')}
              className={`${itemClassName} hover:cursor-pointer`}
            >
              <Icon name="plus" decorative />
              New project…
            </DropdownMenuItem>
            {active && (
              <>
                <DropdownMenuItem
                  onSelect={() => onAction('rename')}
                  className={`${itemClassName} hover:cursor-pointer`}
                >
                  <Icon name="pencil" decorative />
                  <span className="truncate">Rename “{active.title}”…</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onAction('delete')}
                  className={`${itemClassName} hover:cursor-pointer`}
                >
                  <Icon name="trash" decorative />
                  <span className="truncate">Delete “{active.title}”…</span>
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

export function ProjectsSubmenu({
  onAction,
  itemClassName,
}: Pick<ProjectsSubmenuViewProps, 'onAction' | 'itemClassName'>) {
  const { data, isLoading, isError, refetch } = useProjects();
  const navigate = useNavigate();

  return (
    <ProjectsSubmenuView
      projects={data}
      activeId={useProjectId()}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      onSelect={(id) => navigate(projectPath(id))}
      onAction={onAction}
      itemClassName={itemClassName}
    />
  );
}

// Rendered outside the dropdown: the menu unmounts its content on close.
// Opened from a menu, the dialogs have no DialogTrigger for Radix to return
// focus to, so the caller says where it goes.
export function ProjectDialogs({
  dialog,
  onClose,
  onCloseAutoFocus,
}: {
  dialog: ProjectDialog | null;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const { project } = useActiveProject();
  const { createProject, renameProject, deleteProject } = useProjectMutations();
  const { data: documentCount } = useQuery({
    ...outlineQueryOptions(project?.id),
    select: (data) =>
      data.allDocuments.nodes.filter((n) => n.kind === 'document').length,
  });
  const onOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <>
      <ProjectTitleDialog
        open={dialog === 'create'}
        onOpenChange={onOpenChange}
        onCloseAutoFocus={onCloseAutoFocus}
        heading="New project"
        onSave={(title) => createProject.mutateAsync(title)}
      />
      {project && (
        <ProjectTitleDialog
          open={dialog === 'rename'}
          onOpenChange={onOpenChange}
          onCloseAutoFocus={onCloseAutoFocus}
          heading="Rename project"
          defaultTitle={project.title}
          onSave={(title) =>
            renameProject.mutateAsync({ id: project.id, title })
          }
        />
      )}
      {project && documentCount !== undefined && (
        <DeleteProjectDialog
          open={dialog === 'delete'}
          onOpenChange={onOpenChange}
          onCloseAutoFocus={onCloseAutoFocus}
          title={project.title}
          documentCount={documentCount}
          onConfirm={() => deleteProject.mutateAsync(project.id)}
        />
      )}
    </>
  );
}
