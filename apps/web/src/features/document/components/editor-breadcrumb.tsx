import { Fragment } from 'react';
import type { Crumb } from '@web/features/document/hooks/use-breadcrumb';

/**
 * Presentational ancestor breadcrumb for the editor top bar: ancestors muted,
 * the open document emphasised, faint `/` separators. Pure — the ancestry is
 * computed by `useBreadcrumb` and passed in.
 */
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
            <span
              className={
                isLast
                  ? 'truncate font-medium text-foreground'
                  : 'truncate text-muted-foreground'
              }
              aria-current={isLast ? 'page' : undefined}
            >
              {crumb.title}
            </span>
          </Fragment>
        );
      })}
    </nav>
  );
}
