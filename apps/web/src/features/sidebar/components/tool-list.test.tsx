import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { SidebarProvider } from '@ui/components/ui/sidebar';
import { ToolList } from '@web/features/sidebar/components/tool-list';
import { renderWithProviders } from '@web/test/test-utils';

const PROJECT_ID = 'project-1';

function renderAt(initialRoute: string) {
  return renderWithProviders(
    <SidebarProvider>
      <Routes>
        <Route path="/project/:projectId/*" element={<ToolList />} />
      </Routes>
      <Routes>
        <Route path="/project/:projectId/plot" element={<p>plot page</p>} />
        <Route path="*" element={null} />
      </Routes>
    </SidebarProvider>,
    { initialRoute }
  );
}

describe('ToolList', () => {
  it('marks Story as the current page inside the manuscript', () => {
    renderAt(`/project/${PROJECT_ID}/document/doc-1`);

    const story = screen.getByRole('link', { name: 'Story' });
    expect(story).toHaveAttribute('aria-current', 'page');
    expect(story).toHaveAttribute('href', `/project/${PROJECT_ID}`);
    expect(screen.getByRole('link', { name: 'Plot' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('marks Plot as the current page on the plot route', () => {
    renderAt(`/project/${PROJECT_ID}/plot`);

    expect(screen.getByRole('link', { name: 'Plot' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Story' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('opens the plot from the rail', async () => {
    renderAt(`/project/${PROJECT_ID}/document/doc-1`);

    await userEvent.click(screen.getByRole('link', { name: 'Plot' }));

    expect(await screen.findByText('plot page')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plot' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('keeps Characters disabled and drops Timeline', () => {
    renderAt(`/project/${PROJECT_ID}`);

    expect(screen.getByRole('button', { name: 'Characters' })).toBeDisabled();
    expect(screen.queryByText('Timeline')).not.toBeInTheDocument();
  });
});
