import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { SidebarProvider } from '@ui/components/ui/sidebar';
import { AppSidebar } from '@web/features/sidebar/components/app-sidebar';
import { renderWithProviders } from '@web/test/test-utils';

vi.mock('@web/features/sidebar/components/project-header', () => ({
  ProjectHeader: () => null,
}));
vi.mock('@web/features/sidebar/components/sidebar-footer-actions', () => ({
  SidebarFooterActions: () => null,
}));
vi.mock('@web/features/sidebar/components/sections/draft-section', () => ({
  DraftSection: () => <div>Draft section</div>,
}));
vi.mock('@web/features/plot/components/sidebar/plot-sidebar-panel', () => ({
  PlotSidebarPanel: () => <div>Plot panel</div>,
}));

function renderAt(path: string) {
  const { container } = renderWithProviders(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>,
    { initialRoute: path, routePath: '/project/:projectId/*' }
  );
  return container.querySelector('[data-sidebar="content"]');
}

describe('AppSidebar', () => {
  it('shows the plot panel on the Plot route', () => {
    renderAt('/project/p1/plot');

    expect(screen.getByText('Plot panel')).toBeInTheDocument();
    expect(screen.queryByText('Draft section')).not.toBeInTheDocument();
  });

  it.each(['/project/p1', '/project/p1/document/d1'])(
    'shows the draft on %s',
    (path) => {
      renderAt(path);

      expect(screen.getByText('Draft section')).toBeInTheDocument();
      expect(screen.queryByText('Plot panel')).not.toBeInTheDocument();
    }
  );

  // Its lists scroll on their own; a scrolling body would carry the headers
  // and counter away with them.
  it('stops the body scrolling only on the Plot route', () => {
    expect(renderAt('/project/p1/plot')).toHaveClass('overflow-hidden');
  });

  it('keeps the body scrolling for the draft', () => {
    expect(renderAt('/project/p1')).toHaveClass('overflow-auto');
  });
});
