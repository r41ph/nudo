import { describe, it, expect } from 'vitest';
import { act, screen } from '@testing-library/react';
import { createStore } from 'jotai';
import { renderWithProviders } from '@web/test/test-utils';
import { setViewportWidth } from '@web/test/media';
import { AppLayout } from '@web/layouts/app-layout';
import { WorkspaceLayout } from '@web/layouts/workspace-layout';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import { setOutlineOpenAtom } from '@web/shared/state/panels.atom';

function renderLayout(store = createStore()) {
  const view = renderWithProviders(
    <AppLayout>
      <WorkspaceLayout>
        <p>page</p>
      </WorkspaceLayout>
    </AppLayout>,
    { store }
  );
  return { ...view, store };
}

const sidebar = (container: HTMLElement) =>
  container.querySelector('[data-slot="sidebar"]');

const outlinePanel = () =>
  screen.queryByRole('complementary', { name: 'Outline' });

describe('WorkspaceLayout — at or above 1280px', () => {
  it('keeps the sidebar as a sticky column, not an off-canvas panel', () => {
    const { container } = renderLayout();

    expect(outlinePanel()).toBeNull();
    expect(sidebar(container)).toBeInTheDocument();
  });

  it('keeps the sidebar a column at exactly 1280px', () => {
    setViewportWidth(1280);
    renderLayout();

    expect(outlinePanel()).toBeNull();
  });
});

describe('WorkspaceLayout — below 1280px', () => {
  it('wraps the sidebar in a collapsed off-canvas panel', () => {
    setViewportWidth(1024);
    const { container } = renderLayout();

    const panel = outlinePanel();
    expect(panel).toContainElement(sidebar(container) as HTMLElement);
    expect(panel).toHaveAttribute('data-state', 'collapsed');
    expect(panel).toHaveAttribute('inert');
  });

  it('expands the panel when the outline is opened', () => {
    setViewportWidth(1024);
    const { store } = renderLayout();

    act(() => store.set(setOutlineOpenAtom, true));

    expect(outlinePanel()).toHaveAttribute('data-state', 'expanded');
    expect(outlinePanel()).not.toHaveAttribute('inert');
  });

  it('switches presentation when the viewport crosses the breakpoint', () => {
    const { container } = renderLayout();

    act(() => setViewportWidth(1024));
    expect(outlinePanel()).toContainElement(sidebar(container) as HTMLElement);

    act(() => setViewportWidth(1440));
    expect(outlinePanel()).toBeNull();
    expect(sidebar(container)).toBeInTheDocument();
  });
});

describe('WorkspaceLayout — focus mode', () => {
  it.each([1440, 1024])('renders no sidebar at %ipx', (width) => {
    setViewportWidth(width);
    const store = createStore();
    store.set(isFocusModeAtom, true);
    const { container } = renderLayout(store);

    expect(sidebar(container)).toBeNull();
    expect(outlinePanel()).toBeNull();
  });
});
