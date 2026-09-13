import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { Crumb } from '@web/features/document/hooks/use-breadcrumb';

export function EditorBreadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-1.5 text-[13px]"
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <Fragment key={crumb.id}>
            {index > 0 && (
              <span aria-hidden className="text-muted-foreground/50">
                /
              </span>
            )}
            {isLast ? (
              <span
                className="truncate font-medium text-foreground"
                aria-current="page"
              >
                {crumb.title}
              </span>
            ) : (
              <Link
                to={`/document/${crumb.id}`}
                className="truncate rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {crumb.title}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
