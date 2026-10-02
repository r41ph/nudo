import { describe, it, expect } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'jotai';
import { renderWithProviders } from '@web/test/test-utils';
import { setViewportWidth } from '@web/test/media';
import { AppLayout } from '@web/layouts/app-layout';
import { DocumentLayout } from '@web/layouts/document-layout';
import { WorkspaceLayout } from '@web/layouts/workspace-layout';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import { currentDocumentAtom } from '@web/features/document/state/document.store';
import { lastSavedAtom } from '@web/shared/state/save-status.atom';
import {
  inspectorAtom,
  openInspectorAtom,
} from '@web/shared/state/panels.atom';
import type { DocumentDetails } from '@web/features/document/document.types';

const DETAILS: DocumentDetails = {
  id: 'd1',
  title: 'Welcome Document',
  kind: 'document',
  status: null,
  summary: '',
  pov: '',
  createdAt: '2026-09-01T09:00:00Z',
  updatedAt: '2026-09-06T10:25:00Z',
};

function renderLayout({
  focus = true,
  inspectorOpen = false,
  withOutline = false,
}: { focus?: boolean; inspectorOpen?: boolean; withOutline?: boolean } = {}) {
  const store = createStore();
  store.set(isFocusModeAtom, focus);
  if (inspectorOpen) store.set(openInspectorAtom);
  store.set(lastSavedAtom, new Date('2026-09-06T10:25:00'));
  store.set(currentDocumentAtom, {
    id: 'd1',
    title: 'Welcome Document',
    content: [],
    wordCount: 412,
  });
  const layout = (
    <DocumentLayout details={DETAILS}>
      <p>editor</p>
    </DocumentLayout>
  );
  const view = renderWithProviders(
    withOutline ? (
      <AppLayout>
        <WorkspaceLayout>{layout}</WorkspaceLayout>
      </AppLayout>
    ) : (
      layout
    ),
    { store }
  );
  return Object.assign(store, { rerender: view.rerender });
}

const inspector = () =>
  screen.queryByRole('complementary', { name: 'Document details' });

const outlinePanel = () =>
  screen.queryByRole('complementary', { name: 'Outline' });

const toggle = (name: RegExp) => screen.queryByRole('button', { name });

describe('DocumentLayout — inspector', () => {
  it('renders nothing for the inspector until it is opened', () => {
    renderLayout({ focus: false });

    expect(inspector()).toBeNull();
  });

  it('shows the inspector beside the text, not over it', () => {
    renderLayout({ focus: false, inspectorOpen: true });

    expect(inspector()).toBeInTheDocument();
    expect(screen.getByText('editor')).toBeVisible();
    expect(inspector()?.contains(screen.getByText('editor'))).toBe(false);
  });

  it('hides it in focus mode but remembers it was open', () => {
    const store = renderLayout({ focus: true, inspectorOpen: true });

    expect(inspector()).toBeNull();
    expect(store.get(inspectorAtom).isOpen).toBe(true);
  });

  it('shows the new document in place after a switch', () => {
    const store = renderLayout({ focus: false, inspectorOpen: true });

    store.rerender(
      <DocumentLayout
        details={{ ...DETAILS, id: 'd2', updatedAt: '2026-09-07T08:00:00Z' }}
      >
        <p>editor</p>
      </DocumentLayout>
    );

    expect(inspector()).toBeInTheDocument();
    expect(
      screen.getByText('Updated').nextElementSibling?.querySelector('time')
    ).toHaveAttribute('dateTime', '2026-09-07T08:00:00Z');
  });
});

describe('DocumentLayout — word counts', () => {
  it('keeps the strip visible in focus mode', () => {
    renderLayout();

    expect(screen.getByText('document')).toHaveTextContent('412 document');
    expect(screen.getByText('today')).toBeInTheDocument();
    expect(screen.getByText('total')).toBeInTheDocument();
  });
});

describe('DocumentLayout — focus mode', () => {
  it('enters focus mode from the top bar button', async () => {
    const user = userEvent.setup();
    const store = renderLayout({ focus: false });

    await user.click(screen.getByRole('button', { name: 'Enter focus mode' }));

    expect(store.get(isFocusModeAtom)).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Leave focus mode' })
    ).toBeInTheDocument();
  });

  it('exits on Escape', async () => {
    const user = userEvent.setup();
    const store = renderLayout();

    await user.keyboard('{Escape}');

    expect(store.get(isFocusModeAtom)).toBe(false);
  });

  it('exits when the same button is clicked again', async () => {
    const user = userEvent.setup();
    const store = renderLayout();

    await user.click(screen.getByRole('button', { name: 'Leave focus mode' }));

    expect(store.get(isFocusModeAtom)).toBe(false);
    expect(
      screen.getByRole('button', { name: 'Enter focus mode' })
    ).toBeInTheDocument();
  });

  it('shows no breadcrumb, word count or timestamp in the bar', () => {
    renderLayout({ focus: false });

    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByText(/words/)).toBeNull();
    expect(screen.queryByText(/Last saved:/)).toBeNull();
  });

  it('does not listen for Escape outside focus mode', async () => {
    const user = userEvent.setup();
    const store = renderLayout({ focus: false });

    await user.keyboard('{Escape}');

    expect(store.get(isFocusModeAtom)).toBe(false);
  });
});

describe('DocumentLayout — at or above 1280px', () => {
  it.each([1440, 1280])('renders no panel toggles at %ipx', (width) => {
    setViewportWidth(width);
    renderLayout({ focus: false, inspectorOpen: true, withOutline: true });

    expect(toggle(/^(Show|Hide) outline$/)).toBeNull();
    expect(toggle(/^(Show|Hide) details$/)).toBeNull();
  });

  it('pushes the inspector beside the text instead of sliding it over', () => {
    renderLayout({ focus: false, inspectorOpen: true, withOutline: true });

    expect(inspector()).not.toHaveAttribute('data-state');
    expect(outlinePanel()).toBeNull();
  });
});

describe('DocumentLayout — below 1280px', () => {
  it('shows a toggle for each panel, the details one only while open', () => {
    setViewportWidth(1024);
    const store = renderLayout({ focus: false, withOutline: true });

    expect(toggle(/^Show outline$/)).toHaveAttribute(
      'aria-controls',
      outlinePanel()?.id
    );
    expect(toggle(/^(Show|Hide) details$/)).toBeNull();

    act(() => store.set(openInspectorAtom));

    expect(toggle(/^Hide details$/)).toHaveAttribute(
      'aria-controls',
      inspector()?.id
    );
  });

  it('slides the inspector over the page with the outline collapsed', () => {
    setViewportWidth(1024);
    renderLayout({ focus: false, inspectorOpen: true, withOutline: true });

    expect(inspector()).toHaveAttribute('data-state', 'expanded');
    expect(outlinePanel()).toHaveAttribute('data-state', 'collapsed');
  });

  it('collapses the inspector when the outline is opened, and back', async () => {
    setViewportWidth(1024);
    const user = userEvent.setup();
    const store = renderLayout({
      focus: false,
      inspectorOpen: true,
      withOutline: true,
    });

    await user.click(toggle(/^Show outline$/) as HTMLElement);

    expect(outlinePanel()).toHaveAttribute('data-state', 'expanded');
    expect(inspector()).toHaveAttribute('data-state', 'collapsed');
    expect(store.get(inspectorAtom).isOpen).toBe(true);

    await user.click(toggle(/^Show details$/) as HTMLElement);

    expect(inspector()).toHaveAttribute('data-state', 'expanded');
    expect(outlinePanel()).toHaveAttribute('data-state', 'collapsed');
  });
});

describe('DocumentLayout — focus mode across widths', () => {
  it.each([1440, 1024])(
    'keeps the strip and drops the inspector and toggles at %ipx',
    (width) => {
      setViewportWidth(width);
      renderLayout({ focus: true, inspectorOpen: true, withOutline: true });

      expect(screen.getByText('document')).toHaveTextContent('412 document');
      expect(inspector()).toBeNull();
      expect(outlinePanel()).toBeNull();
      expect(toggle(/^(Show|Hide) (outline|details)$/)).toBeNull();
    }
  );
});
