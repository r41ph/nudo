import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { EditorBreadcrumb } from '@web/features/document/components/editor-breadcrumb';
import { renderWithProviders } from '@web/test/test-utils';

const crumbs = [
  { id: 'part-1', title: 'Part I' },
  { id: 'chapter-2', title: 'The Tidewatch' },
  { id: 'scene-3', title: 'A scene at the harbour' },
];

describe('EditorBreadcrumb', () => {
  it('renders ancestors as links to their document', () => {
    renderWithProviders(<EditorBreadcrumb crumbs={crumbs} />);

    expect(screen.getByRole('link', { name: 'Part I' })).toHaveAttribute(
      'href',
      '/document/part-1'
    );
    expect(screen.getByRole('link', { name: 'The Tidewatch' })).toHaveAttribute(
      'href',
      '/document/chapter-2'
    );
  });

  it('renders the open document as the current page, not a link', () => {
    renderWithProviders(<EditorBreadcrumb crumbs={crumbs} />);

    const current = screen.getByText('A scene at the harbour');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(
      screen.queryByRole('link', { name: 'A scene at the harbour' })
    ).not.toBeInTheDocument();
  });

  it('a single root document is the current page with no links', () => {
    renderWithProviders(
      <EditorBreadcrumb crumbs={[{ id: 'only', title: 'The Tidewatch' }]} />
    );

    expect(screen.getByText('The Tidewatch')).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
